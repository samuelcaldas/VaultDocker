'use server';
/**
 * @fileOverview An AI assistant that suggests common file and directory exclusion patterns for Docker volume backups.
 *
 * - suggestExclusionPatterns - A function that handles the suggestion process.
 * - ExclusionPatternSuggesterInput - The input type for the suggestExclusionPatterns function.
 * - ExclusionPatternSuggesterOutput - The return type for the suggestExclusionPatterns function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExclusionPatternSuggesterInputSchema = z.object({
  volumeName: z
    .string()
    .describe(
      'The name of the Docker volume for which to suggest exclusion patterns.'
    ),
});
export type ExclusionPatternSuggesterInput = z.infer<
  typeof ExclusionPatternSuggesterInputSchema
>;

const ExclusionPatternSuggesterOutputSchema = z.object({
  suggestedExclusionPatterns: z
    .array(z.string())
    .describe(
      'A list of suggested file and directory exclusion patterns (e.g., *.log, tmp/, node_modules/).'
    ),
});
export type ExclusionPatternSuggesterOutput = z.infer<
  typeof ExclusionPatternSuggesterOutputSchema
>;

export async function suggestExclusionPatterns(
  input: ExclusionPatternSuggesterInput
): Promise<ExclusionPatternSuggesterOutput> {
  return exclusionPatternSuggesterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'exclusionPatternSuggesterPrompt',
  input: { schema: ExclusionPatternSuggesterInputSchema },
  output: { schema: ExclusionPatternSuggesterOutputSchema },
  prompt: `You are an AI assistant specialized in configuring Docker volume backups.
Your task is to suggest common file and directory exclusion patterns for a given Docker volume.
These patterns should help users create optimized backups by excluding unnecessary data like build artifacts, caches, temporary files, and version control metadata.

Consider the typical contents of a Docker volume and suggest patterns that are commonly excluded in development and production environments.
Examples of patterns include:
- node_modules/
- .git/
- .vscode/
- build/
- dist/
- target/
- *.log
- *.tmp
- temp/
- cache/
- logs/
- vendor/

If the volume name implies a specific technology (e.g., 'my-node-app-data', 'my-python-project', 'go-cache'), provide patterns relevant to that technology.

The output should be a JSON object with a single key 'suggestedExclusionPatterns' which is an array of strings, where each string is an exclusion pattern.

Docker Volume Name: {{{volumeName}}}

Suggested Exclusion Patterns:`,
});

const exclusionPatternSuggesterFlow = ai.defineFlow(
  {
    name: 'exclusionPatternSuggesterFlow',
    inputSchema: ExclusionPatternSuggesterInputSchema,
    outputSchema: ExclusionPatternSuggesterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
