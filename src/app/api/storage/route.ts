import { NextRequest } from 'next/server';
import { ProviderType } from '@prisma/client';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { badRequest, ok, unauthorized, serverError } from '@/server/http';
import type { StorageProviderConfig } from '@/server/storage/types';

const service = new StorageProviderService();

export async function GET() {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const providers = await service.list();
    return ok({ providers });
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
    const user = await requireAuthUser();

    const body = (await request.json()) as {
      name?: string;
      type?: string;
      config?: unknown;
    };

    if (!body.name || !body.type || body.config === undefined) {
      return badRequest('name, type, and config are required.');
    }

    if (!Object.values(ProviderType).includes(body.type as ProviderType)) {
      return badRequest(`type must be one of: ${Object.values(ProviderType).join(', ')}`);
    }

    const provider = await service.create({
      name: body.name,
      type: body.type as ProviderType,
      config: body.config as StorageProviderConfig,
      userId: user.id,
    });

    return ok({ provider }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
