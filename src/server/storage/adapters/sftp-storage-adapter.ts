import { mkdir } from 'fs/promises';
import path from 'path';
import SftpClient from 'ssh2-sftp-client';
import { ProviderType } from '@prisma/client';
import { applyRemotePrefix, ensureDirectoryPath, joinRemotePath, normalizeRemotePath } from '@/server/storage/path-utils';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type {
  SftpProviderConfig,
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

function resolveRemotePath(config: SftpProviderConfig, remotePath: string): string {
  return applyRemotePrefix(config.prefix, remotePath);
}

function toStoragePath(config: SftpProviderConfig, remotePath: string): string {
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

async function withClient<T>(config: SftpProviderConfig, work: (client: SftpClient) => Promise<T>): Promise<T> {
  const client = new SftpClient();

  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase,
      readyTimeout: config.readyTimeoutMs,
    });

    return await work(client);
  } finally {
    await client.end();
  }
}

export class SftpStorageAdapter implements StorageAdapter {
  readonly type = ProviderType.SFTP;

  async testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult> {
    const sftpConfig = config as SftpProviderConfig;

    await withClient(sftpConfig, async (client) => {
      await client.list('.');
    });

    return {
      ok: true,
      message: 'SFTP connection verified.',
    };
  }

  async upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const sftpConfig = config as SftpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(sftpConfig, input.remotePath));

    await withClient(sftpConfig, async (client) => {
      const directory = ensureDirectoryPath(remotePath);
      if (directory) {
        await client.mkdir(directory, true);
      }
      await client.put(input.localPath, remotePath);
    });

    return {
      storagePath: normalizeRemotePath(input.remotePath),
    };
  }

  async download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void> {
    const sftpConfig = config as SftpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(sftpConfig, input.remotePath));

    await mkdir(path.dirname(input.localPath), { recursive: true });

    await withClient(sftpConfig, async (client) => {
      await client.get(remotePath, input.localPath);
    });
  }

  async delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void> {
    const sftpConfig = config as SftpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(sftpConfig, input.remotePath));

    await withClient(sftpConfig, async (client) => {
      await client.delete(remotePath, true);
    });
  }

  async exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean> {
    const sftpConfig = config as SftpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(sftpConfig, input.remotePath));

    return withClient(sftpConfig, async (client) => {
      const result = await client.exists(remotePath);
      return Boolean(result);
    });
  }

  async list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const sftpConfig = config as SftpProviderConfig;
    const directory = normalizeRemotePath(resolveRemotePath(sftpConfig, input.prefix ?? '.'));

    return withClient(sftpConfig, async (client) => {
      const entries = await client.list(directory);

      return entries
        .filter((entry) => entry.type !== 'd')
        .slice(0, input.limit ?? entries.length)
        .map((entry) => ({
          remotePath: toStoragePath(sftpConfig, joinRemotePath(directory, entry.name)),
          sizeBytes: entry.size,
          modifiedAt: entry.modifyTime ? new Date(entry.modifyTime) : undefined,
        }));
    });
  }
}
