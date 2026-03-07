import { NextRequest } from 'next/server';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { badRequest, ok, unauthorized, serverError } from '@/server/http';

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
      basePath?: string;
    };

    if (!body.name || !body.basePath) {
      return badRequest('name and basePath are required.');
    }

    const provider = await service.createLocalProvider({
      name: body.name,
      basePath: body.basePath,
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
