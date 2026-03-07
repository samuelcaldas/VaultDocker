import { BackupRunStatus, type BackupRun } from '@prisma/client';
import { db } from '@/server/db';

export class BackupRunRepository {
  async list(filters: { jobId?: string; status?: BackupRunStatus; limit?: number } = {}): Promise<(BackupRun & { job: { id: string; name: string; volumeId: string; storageProviderId: string; selectedPaths: unknown; exclusionGlobs: unknown; cronExpression: string; nameFormat: string; compressionLevel: number; retentionCount: number; enabled: boolean; lastRunAt: Date | null; createdAt: Date; updatedAt: Date }; })[]> {
    return db.backupRun.findMany({
      where: {
        jobId: filters.jobId,
        status: filters.status,
      },
      include: {
        job: true,
      },
      orderBy: { startedAt: 'desc' },
      take: filters.limit,
    });
  }

  async findById(id: string): Promise<(BackupRun & { job: { id: string; name: string; volumeId: string; storageProviderId: string; selectedPaths: unknown; exclusionGlobs: unknown; cronExpression: string; nameFormat: string; compressionLevel: number; retentionCount: number; enabled: boolean; lastRunAt: Date | null; createdAt: Date; updatedAt: Date } }) | null> {
    return db.backupRun.findUnique({
      where: { id },
      include: { job: true },
    });
  }

  async create(input: {
    jobId: string;
    trigger: string;
    status: BackupRunStatus;
    logs?: string;
  }): Promise<BackupRun> {
    return db.backupRun.create({
      data: {
        jobId: input.jobId,
        trigger: input.trigger,
        status: input.status,
        logs: input.logs,
      },
    });
  }

  async update(id: string, input: Partial<{
    status: BackupRunStatus;
    finishedAt: Date;
    archivePath: string;
    fileSizeBytes: bigint;
    checksum: string;
    logs: string;
    errorMessage: string;
    backupName: string;
    storagePath: string;
  }>): Promise<BackupRun> {
    return db.backupRun.update({ where: { id }, data: input });
  }

  async listSuccessfulByJob(jobId: string): Promise<BackupRun[]> {
    return db.backupRun.findMany({
      where: {
        jobId,
        status: BackupRunStatus.SUCCESS,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async delete(id: string): Promise<void> {
    await db.backupRun.delete({ where: { id } });
  }
}
