import { NextRequest } from 'next/server';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, serverError } from '@/server/http';
import { reloadScheduler } from '@/server/services/scheduler-service';

const repository = new BackupJobRepository();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      volumeId?: string;
      storageProviderId?: string;
      selectedPaths?: string[];
      exclusionGlobs?: string[];
      cronExpression?: string;
      nameFormat?: string;
      compressionLevel?: number;
      retentionCount?: number;
      enabled?: boolean;
    };

    const job = await repository.update(id, {
      name: body.name,
      volumeId: body.volumeId,
      storageProviderId: body.storageProviderId,
      selectedPaths: body.selectedPaths,
      exclusionGlobs: body.exclusionGlobs,
      cronExpression: body.cronExpression,
      nameFormat: body.nameFormat,
      compressionLevel: body.compressionLevel,
      retentionCount: body.retentionCount,
      enabled: body.enabled,
    });

    await reloadScheduler();

    return ok({ job });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    await repository.delete(id);
    await reloadScheduler();

    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
