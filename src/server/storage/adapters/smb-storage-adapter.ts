import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import SMB2 from '@marsaud/smb2';
import { ProviderType } from '@prisma/client';
import { applyRemotePrefix, ensureDirectoryPath, joinRemotePath, normalizeRemotePath } from '@/server/storage/path-utils';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type {
  SmbProviderConfig,
  StorageConnectionResult,
  StorageDeleteInput,
  StorageDownloadInput,
  StorageExistsInput,
  StorageListEntry,
  StorageListInput,
  StorageProviderConfig,
  StorageUploadInput,
  StorageUploadResult,
} from '@/server/storage/types';

function toSmbPath(remotePath: string): string {
  const normalized = normalizeRemotePath(remotePath);
  return normalized.replace(/\//g, '\\');
}

function resolveRemotePath(config: SmbProviderConfig, remotePath: string): string {
  return applyRemotePrefix(config.prefix, remotePath);
}

function toStoragePath(config: SmbProviderConfig, remotePath: string): string {
  const normalized = normalizeRemotePath(remotePath);
  const prefix = normalizeRemotePath(config.prefix ?? '').replace(/\/$/, '');

  if (!prefix) {
    return normalized;
  }

  if (normalized === prefix) {
    return '';
  }

  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length + 1);
  }

  return normalized;
}

async function withClient<T>(config: SmbProviderConfig, work: (client: SMB2) => Promise<T>): Promise<T> {
  const client = new SMB2({
    share: config.share,
    username: config.username,
    password: config.password,
    domain: config.domain ?? '',
    autoCloseTimeout: config.autoCloseTimeout,
  });

  try {
    return await work(client);
  } finally {
    client.disconnect();
  }
}

async function ensureDirectory(client: SMB2, directory: string): Promise<void> {
  if (!directory) {
    return;
  }

  const parts = directory.split('/').filter(Boolean);
  let current = '';

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const smbPath = toSmbPath(current);
    const exists = await client.exists(smbPath);

    if (exists) {
      continue;
    }

    await client.mkdir(smbPath);
  }
}

export class SmbStorageAdapter implements StorageAdapter {
  readonly type = ProviderType.SMB;

  async testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult> {
    const smbConfig = config as SmbProviderConfig;

    await withClient(smbConfig, async (client) => {
      await client.readdir('\\');
    });

    return {
      ok: true,
      message: 'SMB connection verified.',
    };
  }

  async upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const smbConfig = config as SmbProviderConfig;
    const remotePath = resolveRemotePath(smbConfig, input.remotePath);

    await withClient(smbConfig, async (client) => {
      await ensureDirectory(client, ensureDirectoryPath(remotePath));
      const content = await readFile(input.localPath);
      await client.writeFile(toSmbPath(remotePath), content);
    });

    return {
      storagePath: normalizeRemotePath(input.remotePath),
    };
  }

  async download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void> {
    const smbConfig = config as SmbProviderConfig;
    const remotePath = resolveRemotePath(smbConfig, input.remotePath);

    await withClient(smbConfig, async (client) => {
      await mkdir(path.dirname(input.localPath), { recursive: true });
      const content = await client.readFile(toSmbPath(remotePath), { encoding: null });
      await writeFile(input.localPath, content);
    });
  }

  async delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void> {
    const smbConfig = config as SmbProviderConfig;
    const remotePath = resolveRemotePath(smbConfig, input.remotePath);

    await withClient(smbConfig, async (client) => {
      await client.unlink(toSmbPath(remotePath));
    });
  }

  async exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean> {
    const smbConfig = config as SmbProviderConfig;
    const remotePath = resolveRemotePath(smbConfig, input.remotePath);

    return withClient(smbConfig, async (client) => client.exists(toSmbPath(remotePath)));
  }

  async list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const smbConfig = config as SmbProviderConfig;
    const directory = resolveRemotePath(smbConfig, input.prefix ?? '');

    return withClient(smbConfig, async (client) => {
      const stats = await client.readdir(toSmbPath(directory || '.'), { stats: true });

      return stats
        .filter((entry) => !entry.isDirectory())
        .slice(0, input.limit ?? stats.length)
        .map((entry) => ({
          remotePath: toStoragePath(smbConfig, joinRemotePath(directory, entry.name)),
          modifiedAt: entry.mtime,
        }));
    });
  }
}
