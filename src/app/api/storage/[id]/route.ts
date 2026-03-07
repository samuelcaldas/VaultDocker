import { NextRequest } from 'next/server';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, notFound, serverError } from '@/server/http';

const service = new StorageProviderService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      basePath?: string;
    };

    const updated = await service.updateLocalProvider(id, body);
    if (!updated) {
      return notFound('Storage provider not found.');
    }

    return ok({ provider: updated });
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
    await service.delete(id);
    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
