import { mkdir } from 'fs/promises';
import path from 'path';
import { Client } from 'basic-ftp';
import { ProviderType } from '@prisma/client';
import { applyRemotePrefix, ensureDirectoryPath, joinRemotePath, normalizeRemotePath } from '@/server/storage/path-utils';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type {
  FtpProviderConfig,
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

function resolveRemotePath(config: FtpProviderConfig, remotePath: string): string {
  return applyRemotePrefix(config.prefix, remotePath);
}

function toStoragePath(config: FtpProviderConfig, remotePath: string): string {
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

async function withClient<T>(config: FtpProviderConfig, work: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(config.timeoutMs ?? 30_000);

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure,
    });

    return await work(client);
  } finally {
    client.close();
  }
}

export class FtpStorageAdapter implements StorageAdapter {
  readonly type = ProviderType.FTP;

  async testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult> {
    const ftpConfig = config as FtpProviderConfig;

    await withClient(ftpConfig, async (client) => {
      await client.pwd();
    });

    return {
      ok: true,
      message: 'FTP connection verified.',
    };
  }

  async upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const ftpConfig = config as FtpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(ftpConfig, input.remotePath));

    await withClient(ftpConfig, async (client) => {
      const directory = ensureDirectoryPath(remotePath);
      if (directory) {
        await client.ensureDir(directory);
      }
      await client.uploadFrom(input.localPath, path.posix.basename(remotePath));
    });

    return {
      storagePath: normalizeRemotePath(input.remotePath),
    };
  }

  async download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void> {
    const ftpConfig = config as FtpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(ftpConfig, input.remotePath));

    await mkdir(path.dirname(input.localPath), { recursive: true });

    await withClient(ftpConfig, async (client) => {
      await client.downloadTo(input.localPath, remotePath);
    });
  }

  async delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void> {
    const ftpConfig = config as FtpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(ftpConfig, input.remotePath));

    await withClient(ftpConfig, async (client) => {
      await client.remove(remotePath);
    });
  }

  async exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean> {
    const ftpConfig = config as FtpProviderConfig;
    const remotePath = normalizeRemotePath(resolveRemotePath(ftpConfig, input.remotePath));

    return withClient(ftpConfig, async (client) => {
      try {
        await client.size(remotePath);
        return true;
      } catch {
        return false;
      }
    });
  }

  async list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const ftpConfig = config as FtpProviderConfig;
    const directory = normalizeRemotePath(resolveRemotePath(ftpConfig, input.prefix ?? '.'));

    return withClient(ftpConfig, async (client) => {
      const files = await client.list(directory);

      return files
        .filter((entry) => !entry.isDirectory)
        .slice(0, input.limit ?? files.length)
        .map((entry) => ({
          remotePath: toStoragePath(ftpConfig, joinRemotePath(directory, entry.name)),
          sizeBytes: entry.size,
          modifiedAt: entry.modifiedAt,
        }));
    });
  }
}
