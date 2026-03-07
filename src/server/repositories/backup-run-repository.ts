import { BackupRunStatus, type BackupRun } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';

type RunWithJob = Prisma.BackupRunGetPayload<{
  include: {
    job: true;
  };
}>;

export class BackupRunRepository {
  async list(filters: { jobId?: string; status?: BackupRunStatus; limit?: number } = {}): Promise<RunWithJob[]> {
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

  async findById(id: string): Promise<RunWithJob | null> {
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
    finishedAt: Date | null;
    archivePath: string | null;
    fileSizeBytes: bigint;
    checksum: string | null;
    logs: string | null;
    errorMessage: string | null;
    backupName: string | null;
    storagePath: string | null;
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
