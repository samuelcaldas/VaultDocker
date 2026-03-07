import type { BackupJob, Prisma } from '@prisma/client';
import { db } from '@/server/db';

type JobWithVolumeAndProvider = Prisma.BackupJobGetPayload<{
  include: {
    volume: true;
    storageProvider: true;
  };
}>;

type JobListWithRelations = Prisma.BackupJobGetPayload<{
  include: {
    volume: true;
    storageProvider: true;
    runs: {
      take: 1;
      orderBy: { startedAt: 'desc' };
      select: {
        id: true;
        status: true;
        startedAt: true;
      };
    };
  };
}>;

export class BackupJobRepository {
  async listWithRelations(): Promise<JobListWithRelations[]> {
    return db.backupJob.findMany({
      include: {
        volume: true,
        storageProvider: true,
        runs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listEnabled(): Promise<BackupJob[]> {
    return db.backupJob.findMany({ where: { enabled: true } });
  }

  async findById(id: string): Promise<BackupJob | null> {
    return db.backupJob.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string): Promise<JobWithVolumeAndProvider | null> {
    return db.backupJob.findUnique({
      where: { id },
      include: {
        volume: true,
        storageProvider: true,
      },
    });
  }

  async create(input: {
    name: string;
    volumeId: string;
    storageProviderId: string;
    selectedPaths: Prisma.InputJsonValue;
    exclusionGlobs: Prisma.InputJsonValue;
    cronExpression: string;
    nameFormat: string;
    compressionLevel: number;
    retentionCount: number;
    enabled: boolean;
  }): Promise<BackupJob> {
    return db.backupJob.create({ data: input });
  }

  async update(id: string, input: Partial<{
    name: string;
    volumeId: string;
    storageProviderId: string;
    selectedPaths: Prisma.InputJsonValue;
    exclusionGlobs: Prisma.InputJsonValue;
    cronExpression: string;
    nameFormat: string;
    compressionLevel: number;
    retentionCount: number;
    enabled: boolean;
    lastRunAt: Date;
  }>): Promise<BackupJob> {
    return db.backupJob.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<void> {
    await db.backupJob.delete({ where: { id } });
  }
}
