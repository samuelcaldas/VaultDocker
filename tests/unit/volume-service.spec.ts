import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolumeService, getDirectorySizeBytes } from '@/server/services/volume-service';
import { existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import http from 'http';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('http', () => ({
  default: {
    request: vi.fn(),
  },
}));

describe('VolumeService', () => {
  let volumeService: VolumeService;
  let mockRepo: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRepo = {
      list: vi.fn().mockResolvedValue([]),
      upsertVolume: vi.fn().mockResolvedValue({}),
      findById: vi.fn(),
    };
    volumeService = new VolumeService(mockRepo);
  });

  describe('list', () => {
    it('should return a list of volumes', async () => {
      await volumeService.list();
      expect(mockRepo.list).toHaveBeenCalled();
    });
  });

  describe('syncDiscoveredVolumes', () => {
    it('should handle empty discovery gracefully', async () => {
      // Mock docker socket empty
      vi.spyOn(http, 'request').mockImplementation((options, cb: any) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'end') handler();
          }),
          statusCode: 200,
        };
        cb(res);
        return { on: vi.fn(), end: vi.fn() } as any;
      });

      // Mock fs mounts empty
      vi.mocked(existsSync).mockReturnValue(false);

      await volumeService.syncDiscoveredVolumes();
      expect(mockRepo.list).toHaveBeenCalled();
    });
  });

  describe('getFileTree', () => {
    it('should return null if volume not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      const result = await volumeService.getFileTree('123');
      expect(result).toBeNull();
    });

    it('should return sorted tree entries', async () => {
      mockRepo.findById.mockResolvedValue({ mountPath: '/mnt/test' });
      vi.mocked(readdir).mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false },
        { name: 'folder', isDirectory: () => true },
      ] as any);
      vi.mocked(stat).mockResolvedValue({ size: 100 } as any);

      const result = await volumeService.getFileTree('123');
      expect(result?.entries).toHaveLength(2);
      // folders first
      expect(result?.entries[0].name).toBe('folder');
      expect(result?.entries[1].name).toBe('file.txt');
    });
  });

  describe('getDirectorySizeBytes', () => {
    it('should calculate size', async () => {
      vi.mocked(readdir).mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false },
      ] as any);
      vi.mocked(stat).mockResolvedValue({ size: 250 } as any);

      const size = await getDirectorySizeBytes('/test');
      expect(size).toBe(250n);
    });
  });
});
