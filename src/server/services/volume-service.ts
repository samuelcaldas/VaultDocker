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

async function requestDockerSocket<T>(dockerPath: string): Promise<T | null> {
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
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              resolve(null);
            }
            return;
          }
          resolve(null);
        });
      },
    );

    req.on('error', () => resolve(null));
    req.end();
  });
}

async function getDirectorySizeBytes(directoryPath: string): Promise<bigint> {
  let total = BigInt(0);

  const entries = await readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        total += BigInt(fileStat.size);
      }
    } catch {
      continue;
    }
  }

  return total;
}

async function scanMountedVolumes(): Promise<DiscoveredVolume[]> {
  const mountRoot = '/mnt/volumes';

  if (!existsSync(mountRoot)) {
    return [];
  }

  const entries = await readdir(mountRoot, { withFileTypes: true });
  const mounted = entries.filter((entry) => entry.isDirectory());

  const discovered: DiscoveredVolume[] = [];

  for (const dir of mounted) {
    const mountPath = path.join(mountRoot, dir.name);
    let sizeBytes: bigint | undefined;
    try {
      sizeBytes = await getDirectorySizeBytes(mountPath);
    } catch {
      sizeBytes = undefined;
    }

    discovered.push({
      dockerName: dir.name,
      mountPath,
      driver: 'local',
      sizeBytes,
      containers: [],
    });
  }

  return discovered;
}

async function discoverFromDockerSocket(): Promise<DiscoveredVolume[]> {
  const volumesPayload = await requestDockerSocket<DockerVolumeResponse>('/v1.41/volumes');
  const containersPayload = await requestDockerSocket<DockerContainerResponse>('/v1.41/containers/json?all=1');

  if (!volumesPayload?.Volumes) {
    return [];
  }

  const volumeToContainers = new Map<string, string[]>();

  for (const container of containersPayload ?? []) {
    const containerName = container.Names?.[0]?.replace(/^\//, '') ?? 'unknown';
    for (const mount of container.Mounts ?? []) {
      if (mount.Type !== 'volume' || !mount.Name) {
        continue;
      }
      const list = volumeToContainers.get(mount.Name) ?? [];
      list.push(containerName);
      volumeToContainers.set(mount.Name, list);
    }
  }

  const discovered: DiscoveredVolume[] = [];
  for (const volume of volumesPayload.Volumes) {
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

    discovered.push({
      dockerName: name,
      mountPath,
      driver: volume.Driver ?? 'local',
      sizeBytes,
      containers: volumeToContainers.get(name) ?? [],
    });
  }

  return discovered;
}

export class VolumeService {
  private readonly volumeRepository = new VolumeRepository();

  async list() {
    return this.volumeRepository.list();
  }

  async syncDiscoveredVolumes() {
    const socketVolumes = await discoverFromDockerSocket();
    const mountedVolumes = await scanMountedVolumes();

    const byName = new Map<string, DiscoveredVolume>();

    for (const discovered of [...socketVolumes, ...mountedVolumes]) {
      byName.set(discovered.dockerName, discovered);
    }

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

  async getFileTree(volumeId: string, relativePath = '.') {
    const volume = await this.volumeRepository.findById(volumeId);

    if (!volume) {
      return null;
    }

    const sanitizedRelative = relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const absolutePath = path.join(volume.mountPath, sanitizedRelative);

    const entries = await readdir(absolutePath, { withFileTypes: true });
    const payload = await Promise.all(
      entries.map(async (entry) => {
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
      }),
    );

    payload.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      volume,
      currentPath: sanitizedRelative,
      entries: payload,
    };
  }
}
