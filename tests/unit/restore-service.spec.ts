import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestoreService, ensureTarName } from '@/server/services/restore-service';
// Removed fsPromises import
import fs from 'fs';
import { spawn } from 'child_process';

vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
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
    constants: { R_OK: 4 },
  };
});

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('1234-5678'),
  createHash: vi.fn().mockReturnValue({
    update: vi.fn(),
    digest: vi.fn().mockReturnValue('fake-hash'),
  }),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('RestoreService', () => {
  let service: RestoreService;
  let mockRunRepo: any;
  let mockJobRepo: any;
  let mockBackupSvc: any;
  let mockStorageSvc: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunRepo = { findById: vi.fn() };
    mockJobRepo = { findByIdWithRelations: vi.fn() };
    mockBackupSvc = {
      createSafetyBackup: vi.fn(),
      downloadRunToLocal: vi.fn(),
    };
    mockStorageSvc = { decodeConfig: vi.fn() };
    
    service = new RestoreService(mockRunRepo, mockJobRepo, mockBackupSvc, mockStorageSvc);

    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') handler(0);
      }),
    };
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
  });

  describe('restoreRun', () => {
    it('should throw if run not found', async () => {
      mockRunRepo.findById.mockResolvedValue(null);
      await expect(service.restoreRun('run1', { safetyBackup: false })).rejects.toThrow('Backup run not found.');
    });

    it('should throw if job not found', async () => {
      mockRunRepo.findById.mockResolvedValue({ jobId: 'job1' });
      mockJobRepo.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.restoreRun('run1', { safetyBackup: false })).rejects.toThrow('Backup job not found.');
    });

    it('should perform restore successfully with safety backup', async () => {
      mockRunRepo.findById.mockResolvedValue({
        id: 'run1',
        jobId: 'job1',
        storagePath: 'remote/path.tar.gz',
        archivePath: null,
        checksum: 'fake-hash',
      });
      mockJobRepo.findByIdWithRelations.mockResolvedValue({
        name: 'test-job',
        volume: { mountPath: '/mnt/test', dockerName: 'vol1' },
        storageProvider: { type: 'LOCAL' },
      });

      const result = await service.restoreRun('run1', { safetyBackup: true });

      expect(result.ok).toBe(true);
      expect(result.checksum).toBe('fake-hash');
      expect(mockBackupSvc.downloadRunToLocal).toHaveBeenCalled();
      expect(mockBackupSvc.createSafetyBackup).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith(
        'tar',
        expect.arrayContaining(['-xzf', expect.stringContaining('run-run1.tar.gz'), '-C', '/mnt/test']),
        expect.any(Object)
      );
    });

    it('should block restore on checksum mismatch', async () => {
      mockRunRepo.findById.mockResolvedValue({
        id: 'run1',
        jobId: 'job1',
        storagePath: null,
        archivePath: '/local/path.tar.gz',
        checksum: 'wrong-hash',
      });
      mockJobRepo.findByIdWithRelations.mockResolvedValue({
        volume: { mountPath: '/mnt/test' },
      });

      await expect(service.restoreRun('run1', { safetyBackup: false }))
        .rejects.toThrow('Checksum verification failed. Restore blocked.');
    });
  });

  describe('ensureTarName', () => {
    it('should append .tar.gz if missing', () => {
      expect(ensureTarName('backup')).toBe('backup.tar.gz');
      expect(ensureTarName('backup.tar.gz')).toBe('backup.tar.gz');
    });
  });
});
