import type { BackupJob, Prisma } from '@prisma/client';
import { db } from '@/server/db';

export class BackupJobRepository {
  async listWithRelations(): Promise<(BackupJob & {
    volume: { id: string; dockerName: string; mountPath: string; driver: string; sizeBytes: bigint | null; containers: Prisma.JsonValue; lastSeenAt: Date; createdAt: Date; updatedAt: Date };
    storageProvider: { id: string; name: string; type: string; configEncrypted: string; testedAt: Date | null; createdAt: Date; updatedAt: Date; userId: string | null };
    runs: { id: string; status: string; startedAt: Date }[];
  })[]> {
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

  async findByIdWithRelations(id: string): Promise<(BackupJob & {
    volume: { id: string; dockerName: string; mountPath: string; driver: string; sizeBytes: bigint | null; containers: Prisma.JsonValue; lastSeenAt: Date; createdAt: Date; updatedAt: Date };
    storageProvider: { id: string; name: string; type: string; configEncrypted: string; testedAt: Date | null; createdAt: Date; updatedAt: Date; userId: string | null };
  }) | null> {
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
