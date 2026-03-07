import type { Settings } from '@prisma/client';
import { db } from '@/server/db';

export class SettingsRepository {
  async get(): Promise<Settings> {
    return db.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        appName: 'VaultDocker',
        timezone: 'UTC',
        defaultCompression: 6,
        sessionTimeoutMinutes: 60,
      },
    });
  }

  async update(input: Partial<{
    appName: string;
    timezone: string;
    defaultCompression: number;
    webhookUrl: string | null;
    notifyOnFailure: boolean;
    notifyOnSuccess: boolean;
    sessionTimeoutMinutes: number;
  }>): Promise<Settings> {
    return db.settings.update({
      where: { id: 1 },
      data: input,
    });
  }
}
