import { NextRequest } from 'next/server';
import { StorageProviderService } from '@/server/services/storage-provider-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, serverError } from '@/server/http';

const service = new StorageProviderService();

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const result = await service.testConnection(id);

    return ok(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
