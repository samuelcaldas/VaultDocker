import { NextRequest } from 'next/server';
import { BackupRunStatus } from '@prisma/client';
import { BackupService } from '@/server/services/backup-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, serverError } from '@/server/http';

const service = new BackupService();

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const jobId = request.nextUrl.searchParams.get('jobId') ?? undefined;
    const statusValue = request.nextUrl.searchParams.get('status') ?? undefined;
    const status = statusValue && statusValue in BackupRunStatus ? (statusValue as BackupRunStatus) : undefined;

    const limitValue = request.nextUrl.searchParams.get('limit');
    const limit = limitValue ? Number(limitValue) : undefined;

    const runs = await service.listRuns({ jobId, status, limit });

    return ok({ runs });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
