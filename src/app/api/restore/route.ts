import { NextRequest } from 'next/server';
import { RestoreService } from '@/server/services/restore-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { badRequest, ok, unauthorized, serverError } from '@/server/http';

const service = new RestoreService();

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const body = (await request.json()) as {
      runId?: string;
      safetyBackup?: boolean;
    };

    if (!body.runId) {
      return badRequest('runId is required.');
    }

    const result = await service.restoreRun(body.runId, {
      safetyBackup: body.safetyBackup ?? true,
    });

    return ok(result);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
