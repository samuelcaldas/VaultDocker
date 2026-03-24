import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ProviderType } from '@prisma/client';
import { mkdir } from 'fs/promises';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
}));

vi.mock('@/server/repositories/storage-provider-repository', () => {
  return {
    StorageProviderRepository: class {
      list = vi.fn().mockResolvedValue([]);
      findById = vi.fn();
      create = vi.fn().mockResolvedValue({ id: '1', type: 'LOCAL', configEncrypted: 'xyz' });
      update = vi.fn().mockResolvedValue({ id: '1', type: 'LOCAL', configEncrypted: 'xyz' });
      delete = vi.fn();
    },
  };
});

vi.mock('@/server/storage/storage-adapter-factory', () => {
  return {
    StorageAdapterFactory: class {
      get = vi.fn().mockReturnValue({
        testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'Success' }),
      });
    },
  };
});

vi.mock('@/server/storage/storage-config-validator', () => {
  return {
    StorageConfigValidator: class {
      parseTypedConfig = vi.fn().mockReturnValue({ basePath: '/tmp/test' });
      parseLocal = vi.fn().mockReturnValue({ basePath: '/tmp/test' });
      parseForType = vi.fn().mockReturnValue({});
    },
  };
});

vi.mock('@/server/storage/storage-secret-codec', () => {
  return {
    StorageSecretCodec: class {
      encode = vi.fn().mockReturnValue('encrypted');
      decode = vi.fn().mockReturnValue({});
    },
  };
});

vi.mock('@/server/storage/storage-config-redactor', () => {
  return {
    StorageConfigRedactor: class {
      redact = vi.fn().mockReturnValue({});
    },
  };
});

describe('StorageProviderService', () => {
  let service: StorageProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorageProviderService();
  });

  it('should list providers', async () => {
    const list = await service.list();
    expect(list).toEqual([]);
  });

  it('should get a provider by id', async () => {
    // Access mocked repo via service property to set up return value
    const mockRepo = (service as any).repository;
    mockRepo.findById.mockResolvedValue({ id: '1', type: 'LOCAL', configEncrypted: 'xyz' });
    
    const provider = await service.getById('1');
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe('1');
  });

  it('should return null for unknown provider', async () => {
    const mockRepo = (service as any).repository;
    mockRepo.findById.mockResolvedValue(null);
    
    const provider = await service.getById('999');
    expect(provider).toBeNull();
  });

  it('should create a local provider and make directory', async () => {
    const provider = await service.create({
      name: 'Local Backup',
      type: ProviderType.LOCAL,
      userId: 'user1',
      config: { basePath: '/tmp/test' },
    });

    expect(mkdir).toHaveBeenCalledWith('/tmp/test', { recursive: true });
    expect(provider.id).toBe('1');
  });

  it('should test connection successfully', async () => {
    const mockRepo = (service as any).repository;
    mockRepo.findById.mockResolvedValue({ id: '1', type: 'LOCAL', configEncrypted: 'xyz' });

    const result = await service.testConnection('1');
    expect(result.ok).toBe(true);
    expect(mockRepo.update).toHaveBeenCalled();
  });

  it('should delete a provider', async () => {
    const mockRepo = (service as any).repository;
    await service.delete('1');
    expect(mockRepo.delete).toHaveBeenCalledWith('1');
  });
});
