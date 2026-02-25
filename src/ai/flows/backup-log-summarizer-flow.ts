'use server';
/**
 * @fileOverview A Genkit flow that summarizes backup run logs, focusing on issues for failed jobs.
 *
 * - summarizeBackupLogs - A function that handles the backup log summarization process.
 * - BackupLogSummarizerInput - The input type for the summarizeBackupLogs function.
 * - BackupLogSummarizerOutput - The return type for the summarizeBackupLogs function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BackupLogSummarizerInputSchema = z.object({
  logs: z.string().describe('The full log output of a backup run.'),
  status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']).describe('The status of the backup run. This helps the AI focus on issues for FAILED statuses.'),
});
export type BackupLogSummarizerInput = z.infer<typeof BackupLogSummarizerInputSchema>;

const BackupLogSummarizerOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the backup logs, highlighting success or the cause of any failures.'),
});
export type BackupLogSummarizerOutput = z.infer<typeof BackupLogSummarizerOutputSchema>;

export async function summarizeBackupLogs(input: BackupLogSummarizerInput): Promise<BackupLogSummarizerOutput> {
  return backupLogSummarizerFlow(input);
}

const backupLogSummarizerPrompt = ai.definePrompt({
  name: 'backupLogSummarizerPrompt',
  input: { schema: BackupLogSummarizerInputSchema },
  output: { schema: BackupLogSummarizerOutputSchema },
  prompt: `You are an AI assistant specialized in analyzing backup logs.
Your task is to provide a concise summary of the provided backup run logs.

If the backup run status is 'SUCCESS', clearly state that the backup completed successfully.

If the backup run status is 'FAILED', identify the primary cause of the failure and explain it clearly and concisely. Focus on identifying error messages, specific issues, or unusual behavior that prevented the backup from completing.

Backup Run Status: {{{status}}}
Backup Logs:
{{{logs}}}`,
});

const backupLogSummarizerFlow = ai.defineFlow(
  {
    name: 'backupLogSummarizerFlow',
    inputSchema: BackupLogSummarizerInputSchema,
    outputSchema: BackupLogSummarizerOutputSchema,
  },
  async (input) => {
    const { output } = await backupLogSummarizerPrompt(input);
    return output!;
  }
);
