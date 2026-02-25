'use server';
/**
 * @fileOverview An AI assistant that suggests and generates consistent backup archive name formats.
 *
 * - suggestBackupNameFormat - A function that suggests backup naming formats.
 * - BackupNamingAssistantInput - The input type for the suggestBackupNameFormat function.
 * - BackupNamingAssistantOutput - The return type for the suggestBackupNameFormat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BackupNamingAssistantInputSchema = z.object({
  jobName: z.string().describe('The name of the backup job.'),
  volumeName: z.string().describe('The name of the Docker volume being backed up.'),
  existingFormats: z
    .array(z.string())
    .optional()
    .describe('An optional array of existing backup naming formats to learn from.'),
  availableTokens: z
    .array(z.string())
    .describe(
      'An array of available tokens for naming, e.g., {job}, {volume}, {date}, {time}, {timestamp}, {seq}.'
    ),
  description: z.string().optional().describe('A brief description of the backup job or its purpose.'),
});
export type BackupNamingAssistantInput = z.infer<typeof BackupNamingAssistantInputSchema>;

const BackupNamingAssistantOutputSchema = z.object({
  suggestedFormats: z
    .array(z.string())
    .describe(
      'An array of suggested naming format strings based on the input and common conventions. E.g., {job}_{volume}_{date}_{time}.tar.gz'
    ),
  explanation: z
    .string()
    .describe('An explanation for the suggested naming formats, highlighting the reasoning and benefits of each.'),
});
export type BackupNamingAssistantOutput = z.infer<typeof BackupNamingAssistantOutputSchema>;

export async function suggestBackupNameFormat(
  input: BackupNamingAssistantInput
): Promise<BackupNamingAssistantOutput> {
  return backupNamingAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'backupNamingAssistantPrompt',
  input: {schema: BackupNamingAssistantInputSchema},
  output: {schema: BackupNamingAssistantOutputSchema},
  prompt: `You are an AI assistant designed to help users create consistent and descriptive backup archive name formats.

Here's the context for the backup job:
Job Name: {{{jobName}}}
Volume Name: {{{volumeName}}}
{{#if description}}Description: {{{description}}}{{/if}}

Available tokens for naming are: {{{availableTokens}}}

{{#if existingFormats}}
Here are some existing naming formats to consider as examples (but feel free to suggest new ones):
{{#each existingFormats}}- {{{this}}}
{{/each}}
{{/if}}

Suggest 3-5 distinct and high-quality naming formats using the available tokens and common conventions (e.g., separating elements with underscores or hyphens, including file extensions like .tar.gz). Provide a brief explanation for each suggestion, highlighting its benefits or the scenarios where it would be most useful. Ensure the output is a valid JSON object matching the output schema.

Consider patterns that make backups easy to sort, identify, and understand, such as including job name, volume name, date, and time. Always include a file extension like ".tar.gz".`,
});

const backupNamingAssistantFlow = ai.defineFlow(
  {
    name: 'backupNamingAssistantFlow',
    inputSchema: BackupNamingAssistantInputSchema,
    outputSchema: BackupNamingAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
