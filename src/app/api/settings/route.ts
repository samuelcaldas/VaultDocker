import { NextRequest } from 'next/server';
import { SettingsRepository } from '@/server/repositories/settings-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAdminUser } from '@/server/api-auth';
import { forbidden, ok, unauthorized, serverError } from '@/server/http';

const repository = new SettingsRepository();

export async function GET() {
  try {
    await ensureRuntimeReady();
    await requireAdminUser();

    const settings = await repository.get();
    return ok({ settings });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    if ((error as Error).message === 'Forbidden') {
      return forbidden();
    }
    return serverError((error as Error).message);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAdminUser();

    const body = (await request.json()) as {
      appName?: string;
      timezone?: string;
      defaultCompression?: number;
      webhookUrl?: string | null;
      notifyOnFailure?: boolean;
      notifyOnSuccess?: boolean;
      sessionTimeoutMinutes?: number;
    };

    const settings = await repository.update({
      appName: body.appName,
      timezone: body.timezone,
      defaultCompression: body.defaultCompression,
      webhookUrl: body.webhookUrl,
      notifyOnFailure: body.notifyOnFailure,
      notifyOnSuccess: body.notifyOnSuccess,
      sessionTimeoutMinutes: body.sessionTimeoutMinutes,
    });

    return ok({ settings });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    if ((error as Error).message === 'Forbidden') {
      return forbidden();
    }
    return serverError((error as Error).message);
  }
}
