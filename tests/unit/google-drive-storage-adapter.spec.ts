import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveStorageAdapter } from '@/server/storage/adapters/google-drive-storage-adapter';
import type { GoogleDriveProviderConfig } from '@/server/storage/types';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

vi.mock('fs', () => {
  return {
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn(), on: vi.fn() }),
    createWriteStream: vi.fn().mockReturnValue({ pipe: vi.fn(), on: vi.fn(), emit: vi.fn() }),
  };
});

vi.mock('googleapis', () => {
  const mockDrive = {
    files: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    }
  };

  return {
    google: {
      auth: {
        OAuth2: class {
          setCredentials = vi.fn();
          getTokenInfo = vi.fn().mockResolvedValue({});
        },
      },
      drive: vi.fn().mockReturnValue(mockDrive),
    },
  };
});

describe('GoogleDriveStorageAdapter', () => {
  let adapter: GoogleDriveStorageAdapter;
  let config: GoogleDriveProviderConfig;
  let mockDriveFiles: any;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GoogleDriveStorageAdapter();
    config = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      folderId: 'folder-123',
    };
    mockDriveFiles = google.drive({ version: 'v3', auth: {} as any }).files;
  });

  describe('testConnection', () => {
    it('should return ok if connection succeeds', async () => {
      mockDriveFiles.list.mockResolvedValueOnce({ data: { files: [] } });

      const result = await adapter.testConnection(config);
      expect(result.ok).toBe(true);
      expect(mockDriveFiles.list).toHaveBeenCalled();
    });

    it('should return false if connection fails', async () => {
      mockDriveFiles.list.mockRejectedValueOnce(new Error('Auth failed'));

      const result = await adapter.testConnection(config);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Auth failed');
    });
  });

  describe('upload', () => {
    it('should upload a file and return the remote path', async () => {
      mockDriveFiles.create.mockResolvedValueOnce({ data: { id: 'file-123', name: 'backup.tar.gz' } });

      const result = await adapter.upload(config, {
        localPath: '/tmp/backup.tar.gz',
        remotePath: 'backup.tar.gz',
      });

      expect(result.storagePath).toBe('file-123');
      expect(mockDriveFiles.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a file by ID', async () => {
      mockDriveFiles.delete.mockResolvedValueOnce({});

      await adapter.delete(config, { remotePath: 'file-123' });

      expect(mockDriveFiles.delete).toHaveBeenCalledWith({
        fileId: 'file-123',
      });
    });
  });
});
