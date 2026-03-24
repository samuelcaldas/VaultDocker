import { describe, it, expect, vi } from 'vitest';
import { summarizeBackupLogs } from '@/ai/flows/backup-log-summarizer-flow';

vi.mock('@/ai/genkit', () => {
  const mockPrompt = vi.fn().mockResolvedValue({
    output: {
      summary: 'Backup completed successfully.'
    }
  });

  return {
    ai: {
      definePrompt: vi.fn().mockReturnValue(mockPrompt),
      defineFlow: vi.fn().mockImplementation((config, fn) => fn),
    }
  };
});

describe('BackupLogSummarizer', () => {
  it('should return log summary', async () => {
    const input = {
      logs: 'some logs',
      status: 'SUCCESS' as const,
    };

    const result = await summarizeBackupLogs(input);
    expect(result.summary).toBe('Backup completed successfully.');
  });
});
