import { existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import http from 'http';
import path from 'path';
import { VolumeRepository } from '@/server/repositories/volume-repository';

type DiscoveredVolume = {
  dockerName: string;
  mountPath: string;
  driver: string;
  sizeBytes?: bigint;
  containers: string[];
};

type DockerVolumeResponse = {
  Volumes?: Array<{
    Name: string;
    Driver?: string;
    Mountpoint?: string;
  }>;
};

type DockerContainerResponse = Array<{
  Names?: string[];
  Mounts?: Array<{
    Name?: string;
    Type?: string;
  }>;
}>;

export async function requestDockerSocket<T>(dockerPath: string): Promise<T | null> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        socketPath: '/var/run/docker.sock',
        path: dockerPath,
        method: 'GET',
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk.toString();
        });
        response.on('end', () => handleSocketEnd(response, data, resolve));
      },
    );

    req.on('error', () => resolve(null));
    req.end();
  });
}

function handleSocketEnd(response: http.IncomingMessage, data: string, resolve: (value: any) => void) {
  if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
    resolve(null);
    return;
  }
  parseSocketData(data, resolve);
}

function parseSocketData(data: string, resolve: (value: any) => void) {
  try {
    resolve(JSON.parse(data));
  } catch {
    resolve(null);
  }
}

export async function getDirectorySizeBytes(directoryPath: string): Promise<bigint> {
  let total = BigInt(0);

  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    total += await getEntrySizeBytes(directoryPath, entry);
  }

  return total;
}

async function getEntrySizeBytes(directoryPath: string, entry: any): Promise<bigint> {
  const fullPath = path.join(directoryPath, entry.name);
  try {
    if (entry.isDirectory()) {
      return await getDirectorySizeBytes(fullPath);
    }
    return await getFileSizeBytes(fullPath);
  } catch {
    return BigInt(0);
  }
}

async function getFileSizeBytes(fullPath: string): Promise<bigint> {
  const fileStat = await stat(fullPath);
  return BigInt(fileStat.size);
}

export async function scanMountedVolumes(): Promise<DiscoveredVolume[]> {
  const mountRoot = '/mnt/volumes';

  if (!existsSync(mountRoot)) {
    return [];
  }

  const entries = await readdir(mountRoot, { withFileTypes: true });
  const mounted = entries.filter((entry) => entry.isDirectory());

  return Promise.all(mounted.map(dir => buildMountedVolume(mountRoot, dir.name)));
}

async function buildMountedVolume(mountRoot: string, dirName: string): Promise<DiscoveredVolume> {
  const mountPath = path.join(mountRoot, dirName);
  let sizeBytes: bigint | undefined;
  try {
    sizeBytes = await getDirectorySizeBytes(mountPath);
  } catch {
    sizeBytes = undefined;
  }

  return {
    dockerName: dirName,
    mountPath,
    driver: 'local',
    sizeBytes,
    containers: [],
  };
}

export async function discoverFromDockerSocket(): Promise<DiscoveredVolume[]> {
  const volumesPayload = await requestDockerSocket<DockerVolumeResponse>('/v1.41/volumes');
  const containersPayload = await requestDockerSocket<DockerContainerResponse>('/v1.41/containers/json?all=1');

  if (!volumesPayload?.Volumes) {
    return [];
  }

  const volumeToContainers = buildContainerMapping(containersPayload);
  return Promise.all(volumesPayload.Volumes.map(vol => buildSocketVolume(vol, volumeToContainers)));
}

function buildContainerMapping(containersPayload: DockerContainerResponse | null): Map<string, string[]> {
  const volumeToContainers = new Map<string, string[]>();
  for (const container of containersPayload ?? []) {
    processContainerMounts(container, volumeToContainers);
  }
  return volumeToContainers;
}

function processContainerMounts(container: any, volumeToContainers: Map<string, string[]>) {
  const containerName = container.Names?.[0]?.replace(/^\//, '') ?? 'unknown';
  for (const mount of container.Mounts ?? []) {
    addMountToMapping(mount, containerName, volumeToContainers);
  }
}

function addMountToMapping(mount: any, containerName: string, volumeToContainers: Map<string, string[]>) {
  if (mount.Type !== 'volume' || !mount.Name) {
    return;
  }
  const list = volumeToContainers.get(mount.Name) ?? [];
  list.push(containerName);
  volumeToContainers.set(mount.Name, list);
}

async function buildSocketVolume(volume: any, volumeToContainers: Map<string, string[]>): Promise<DiscoveredVolume> {
  const name = volume.Name;
  const mountedPath = `/mnt/volumes/${name}`;
  const fallbackPath = volume.Mountpoint ?? mountedPath;
  const mountPath = existsSync(mountedPath) ? mountedPath : fallbackPath;

  let sizeBytes: bigint | undefined;
  if (existsSync(mountPath)) {
    try {
      sizeBytes = await getDirectorySizeBytes(mountPath);
    } catch {
      sizeBytes = undefined;
    }
  }

  return {
    dockerName: name,
    mountPath,
    driver: volume.Driver ?? 'local',
    sizeBytes,
    containers: volumeToContainers.get(name) ?? [],
  };
}

export class VolumeService {
  private readonly volumeRepository: VolumeRepository;

  constructor(repository = new VolumeRepository()) {
    this.volumeRepository = repository;
  }

  async list() {
    return this.volumeRepository.list();
  }

  async syncDiscoveredVolumes() {
    const socketVolumes = await discoverFromDockerSocket();
    const mountedVolumes = await scanMountedVolumes();

    const byName = new Map<string, DiscoveredVolume>();
    this.addToMap(byName, socketVolumes);
    this.addToMap(byName, mountedVolumes);

    const now = new Date();
    const upserts = Array.from(byName.values()).map((item) =>
      this.volumeRepository.upsertVolume({
        dockerName: item.dockerName,
        mountPath: item.mountPath,
        driver: item.driver,
        sizeBytes: item.sizeBytes,
        containers: item.containers,
        lastSeenAt: now,
      }),
    );

    await Promise.all(upserts);
    return this.volumeRepository.list();
  }

  private addToMap(map: Map<string, DiscoveredVolume>, volumes: DiscoveredVolume[]) {
    for (const discovered of volumes) {
      map.set(discovered.dockerName, discovered);
    }
  }

  async getFileTree(volumeId: string, relativePath = '.') {
    const volume = await this.volumeRepository.findById(volumeId);

    if (!volume) {
      return null;
    }

    const sanitizedRelative = relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const absolutePath = path.join(volume.mountPath, sanitizedRelative);

    const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => []);
    const payload = await Promise.all(
      entries.map(entry => this.buildTreeEntry(absolutePath, sanitizedRelative, entry))
    );

    this.sortTreeEntries(payload);

    return {
      volume,
      currentPath: sanitizedRelative,
      entries: payload,
    };
  }

  private async buildTreeEntry(absolutePath: string, sanitizedRelative: string, entry: any) {
    const entryPath = path.join(absolutePath, entry.name);
    let size = 0;

    try {
      const entryStat = await stat(entryPath);
      size = entryStat.size;
    } catch {
      size = 0;
    }

    return {
      name: entry.name,
      path: path.join(sanitizedRelative, entry.name),
      isDirectory: entry.isDirectory(),
      size,
    };
  }

  private sortTreeEntries(payload: any[]) {
    payload.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
