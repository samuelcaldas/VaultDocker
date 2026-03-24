import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestBackupNameFormat } from '@/ai/flows/backup-naming-assistant';

vi.mock('@/ai/genkit', () => {
  const mockPrompt = vi.fn().mockResolvedValue({
    output: {
      suggestedFormats: ['{job}_{date}.tar.gz'],
      explanation: 'Simple format'
    }
  });

  return {
    ai: {
      definePrompt: vi.fn().mockReturnValue(mockPrompt),
      defineFlow: vi.fn().mockImplementation((config, fn) => fn),
    }
  };
});

describe('BackupNamingAssistant', () => {
  it('should return suggested formats', async () => {
    const input = {
      jobName: 'test-job',
      volumeName: 'test-vol',
      availableTokens: ['{job}', '{date}'],
    };

    const result = await suggestBackupNameFormat(input);
    expect(result.suggestedFormats).toContain('{job}_{date}.tar.gz');
    expect(result.explanation).toBe('Simple format');
  });
});
