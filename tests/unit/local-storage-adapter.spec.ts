import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '@/server/storage/adapters/local-storage-adapter';
import { mkdir, access, copyFile, readdir, rm, stat } from 'fs/promises';
import { ProviderType } from '@prisma/client';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  rm: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
}));

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  const config = { basePath: '/tmp/local' };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LocalStorageAdapter();
  });

  it('should test connection', async () => {
    const result = await adapter.testConnection(config);
    expect(result.ok).toBe(true);
    expect(mkdir).toHaveBeenCalledWith('/tmp/local', { recursive: true });
  });

  it('should upload a file', async () => {
    const result = await adapter.upload(config, {
      localPath: '/src/file.txt',
      remotePath: 'dest.txt'
    });
    expect(result.storagePath).toBe('dest.txt');
    expect(copyFile).toHaveBeenCalled();
  });

  it('should delete a file', async () => {
    await adapter.delete(config, { remotePath: 'file.txt' });
    expect(rm).toHaveBeenCalled();
  });
});
