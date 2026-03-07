import { NextRequest } from 'next/server';
import { VolumeService } from '@/server/services/volume-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { ok, unauthorized, serverError } from '@/server/http';

const service = new VolumeService();

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    const volumes = refresh ? await service.syncDiscoveredVolumes() : await service.list();

    return ok({ volumes });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }

    return serverError((error as Error).message);
  }
}

export async function POST() {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();
    const volumes = await service.syncDiscoveredVolumes();

    return ok({ volumes });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }

    return serverError((error as Error).message);
  }
}
