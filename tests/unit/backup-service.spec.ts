import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService, formatBackupName, ensureTarExtension, sanitizePathSegment } from '@/server/services/backup-service';
import fsPromises from 'fs/promises';
import { EventEmitter } from 'events';

vi.mock('child_process', () => {
  return {
    spawn: vi.fn().mockImplementation(() => {
      const process = new EventEmitter() as any;
      process.stdout = new EventEmitter();
      process.stdout.pipe = vi.fn();
      process.stderr = new EventEmitter();
      process.stdin = new EventEmitter();
      setTimeout(() => process.emit('close', 0), 10);
      return process;
    }),
  };
});

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => {
  const original = importOriginal => importOriginal;
  return {
    ...original,
    createReadStream: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('test-data');
      }
    }),
    createWriteStream: vi.fn().mockImplementation(() => {
      const stream = new EventEmitter() as any;
      setTimeout(() => stream.emit('close'), 10);
      return stream;
    }),
  };
});

vi.mock('@/server/repositories/backup-job-repository', () => ({
  BackupJobRepository: class {
    findByIdWithRelations = vi.fn();
    update = vi.fn();
  },
}));

vi.mock('@/server/repositories/backup-run-repository', () => ({
  BackupRunRepository: class {
    create = vi.fn().mockResolvedValue({ id: 'run1' });
    update = vi.fn();
    findById = vi.fn();
    listSuccessfulByJob = vi.fn().mockResolvedValue([]);
    list = vi.fn().mockResolvedValue([]);
    delete = vi.fn();
  },
}));

vi.mock('@/server/services/storage-provider-service', () => ({
  StorageProviderService: class {
    getAdapter = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ storagePath: 'remote/path' }),
      download: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    });
    decodeConfig = vi.fn().mockReturnValue({});
  },
}));

// Partially mock backup-service functions used internally without exporting them separately in a way that breaks
vi.mock('@/server/services/backup-service', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    runArchiveCommand: vi.fn().mockResolvedValue('logs'),
    computeSha256: vi.fn().mockResolvedValue('fake-hash'),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

describe('BackupService', () => {
  let service: BackupService;
  let mockJobRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BackupService();
    mockJobRepo = (service as any).jobRepository;
  });

  describe('runJob', () => {
    it('should throw if job not found', async () => {
      mockJobRepo.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.runJob('job1')).rejects.toThrow('Backup job not found.');
    });

    it('should successfully run a backup job', async () => {
      mockJobRepo.findByIdWithRelations.mockResolvedValue({
        id: 'job1',
        name: 'test-job',
        volume: { mountPath: '/mnt/test', dockerName: 'vol1' },
        storageProvider: { type: 'LOCAL' },
        nameFormat: '{job}',
        retentionCount: 5,
        selectedPaths: [],
        exclusionGlobs: [],
        compressionLevel: 6,
      });

      (service as any).runRepository.findById.mockResolvedValue({ id: 'run1', status: 'SUCCESS' });
      
      const run = await service.runJob('job1');
      expect(run.status).toBe('SUCCESS');
    });
  });

  describe('Helpers', () => {
    it('ensureTarExtension', () => {
      expect(ensureTarExtension('file')).toBe('file.tar.gz');
      expect(ensureTarExtension('file.tar.gz')).toBe('file.tar.gz');
    });

    it('sanitizePathSegment', () => {
      expect(sanitizePathSegment('invalid/path:')).toBe('invalid_path_');
    });

    it('formatBackupName', () => {
      const name = formatBackupName('{job}-{volume}-{seq}', { job: 'a', volume: 'b', seq: '001' });
      expect(name).toBe('a-b-001.tar.gz');
    });
  });
});
