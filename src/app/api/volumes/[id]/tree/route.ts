import { NextRequest } from 'next/server';
import { VolumeService } from '@/server/services/volume-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, notFound, serverError } from '@/server/http';

const service = new VolumeService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const treePath = request.nextUrl.searchParams.get('path') ?? '.';

    const tree = await service.getFileTree(id, treePath);

    if (!tree) {
      return notFound('Volume not found.');
    }

    return ok(tree);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }

    return serverError((error as Error).message);
  }
}
