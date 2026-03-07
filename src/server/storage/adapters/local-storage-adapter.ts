import { constants as fsConstants } from 'fs';
import { access, copyFile, mkdir, readdir, rm, stat } from 'fs/promises';
import path from 'path';
import { ProviderType } from '@prisma/client';
import { ensureDirectoryPath, joinRemotePath, normalizeRemotePath } from '@/server/storage/path-utils';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type {
  LocalProviderConfig,
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

function resolveAbsolutePath(config: LocalProviderConfig, remotePath: string): string {
  const normalized = normalizeRemotePath(remotePath);
  return path.join(config.basePath, normalized);
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly type = ProviderType.LOCAL;

  async testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult> {
    const localConfig = config as LocalProviderConfig;

    await mkdir(localConfig.basePath, { recursive: true });
    await access(localConfig.basePath, fsConstants.R_OK | fsConstants.W_OK);

    return {
      ok: true,
      message: 'Local storage path is accessible.',
    };
  }

  async upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const localConfig = config as LocalProviderConfig;
    const absolutePath = resolveAbsolutePath(localConfig, input.remotePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await copyFile(input.localPath, absolutePath);

    return {
      storagePath: normalizeRemotePath(input.remotePath),
    };
  }

  async download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void> {
    const localConfig = config as LocalProviderConfig;
    const absolutePath = resolveAbsolutePath(localConfig, input.remotePath);

    await mkdir(path.dirname(input.localPath), { recursive: true });
    await copyFile(absolutePath, input.localPath);
  }

  async delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void> {
    const localConfig = config as LocalProviderConfig;
    const absolutePath = resolveAbsolutePath(localConfig, input.remotePath);

    await rm(absolutePath, { force: true });
  }

  async exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean> {
    const localConfig = config as LocalProviderConfig;
    const absolutePath = resolveAbsolutePath(localConfig, input.remotePath);

    try {
      await access(absolutePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const localConfig = config as LocalProviderConfig;
    const prefix = joinRemotePath('', input.prefix ?? '');
    const directory = resolveAbsolutePath(localConfig, prefix);

    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());

    const payload: StorageListEntry[] = [];

    for (const file of files) {
      const absolute = path.join(directory, file.name);
      const fileStat = await stat(absolute);
      const directoryPath = ensureDirectoryPath(prefix);
      const remotePath = joinRemotePath(directoryPath, file.name);

      payload.push({
        remotePath,
        sizeBytes: fileStat.size,
        modifiedAt: fileStat.mtime,
      });
    }

    return payload.slice(0, input.limit ?? payload.length);
  }
}
