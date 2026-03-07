import { NextRequest } from 'next/server';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { badRequest, ok, unauthorized, notFound, serverError } from '@/server/http';

const service = new StorageProviderService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      config?: unknown;
    };

    if (body.name === undefined && body.config === undefined) {
      return badRequest('At least one of name or config is required.');
    }

    if (body.config !== undefined && (typeof body.config !== 'object' || body.config === null || Array.isArray(body.config))) {
      return badRequest('config must be an object when provided.');
    }

    const updated = await service.update(id, {
      name: body.name,
      config: body.config as Record<string, unknown> | undefined,
    });
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
