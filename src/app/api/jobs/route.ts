import { NextRequest } from 'next/server';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { badRequest, ok, unauthorized, serverError } from '@/server/http';
import { reloadScheduler } from '@/server/services/scheduler-service';

const repository = new BackupJobRepository();

export async function GET() {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const jobs = await repository.listWithRelations();
    return ok({ jobs });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

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

    if (!body.name || !body.volumeId || !body.storageProviderId || !body.cronExpression) {
      return badRequest('name, volumeId, storageProviderId, and cronExpression are required.');
    }

    const job = await repository.create({
      name: body.name,
      volumeId: body.volumeId,
      storageProviderId: body.storageProviderId,
      selectedPaths: body.selectedPaths ?? ['.'],
      exclusionGlobs: body.exclusionGlobs ?? [],
      cronExpression: body.cronExpression,
      nameFormat: body.nameFormat ?? '{job}_{volume}_{date}_{time}',
      compressionLevel: body.compressionLevel ?? 6,
      retentionCount: body.retentionCount ?? 10,
      enabled: body.enabled ?? true,
    });

    await reloadScheduler();

    return ok({ job }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
