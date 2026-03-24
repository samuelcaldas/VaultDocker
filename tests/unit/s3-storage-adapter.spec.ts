import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3StorageAdapter } from '@/server/storage/adapters/s3-storage-adapter';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = vi.fn();
  },
  HeadBucketCommand: class {},
  GetObjectCommand: class {},
  DeleteObjectCommand: class {},
  HeadObjectCommand: class {},
  ListObjectsV2Command: class {},
}));

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: class {
    done = vi.fn().mockResolvedValue({});
  },
}));

vi.mock('fs', () => ({
  createReadStream: vi.fn().mockReturnValue({}),
  createWriteStream: vi.fn().mockReturnValue({}),
}));

describe('S3StorageAdapter', () => {
  let adapter: S3StorageAdapter;
  const config = {
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKeyId: 'key',
    secretAccessKey: 'secret'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new S3StorageAdapter();
  });

  it('should test connection', async () => {
    const result = await adapter.testConnection(config);
    expect(result.ok).toBe(true);
  });

  it('should upload a file', async () => {
    const result = await adapter.upload(config, {
      localPath: 'local.txt',
      remotePath: 'remote.txt'
    });
    expect(result.storagePath).toBe('remote.txt');
  });
});
