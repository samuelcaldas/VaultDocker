import { config } from 'dotenv';
config();

import '@/ai/flows/backup-log-summarizer-flow.ts';
import '@/ai/flows/exclusion-pattern-suggester.ts';
import '@/ai/flows/backup-naming-assistant.ts';