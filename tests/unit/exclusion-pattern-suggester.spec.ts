import { describe, it, expect, vi } from 'vitest';
import { suggestExclusionPatterns } from '@/ai/flows/exclusion-pattern-suggester';

vi.mock('@/ai/genkit', () => {
  const mockPrompt = vi.fn().mockResolvedValue({
    output: {
      suggestedExclusionPatterns: ['node_modules/', '.git/']
    }
  });

  return {
    ai: {
      definePrompt: vi.fn().mockReturnValue(mockPrompt),
      defineFlow: vi.fn().mockImplementation((config, fn) => fn),
    }
  };
});

describe('ExclusionPatternSuggester', () => {
  it('should return suggested exclusion patterns', async () => {
    const input = {
      volumeName: 'test-volume',
    };

    const result = await suggestExclusionPatterns(input);
    expect(result.suggestedExclusionPatterns).toContain('node_modules/');
    expect(result.suggestedExclusionPatterns).toContain('.git/');
  });
});
