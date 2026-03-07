import { NextRequest } from 'next/server';
import { BackupService } from '@/server/services/backup-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, notFound, serverError } from '@/server/http';

const service = new BackupService();

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const run = await service.getRun(id);

    if (!run) {
      return notFound('Backup run not found.');
    }

    return ok({ logs: run.logs ?? '', run });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
