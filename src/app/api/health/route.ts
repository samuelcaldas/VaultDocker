import { db } from '@/server/db';
import { ensureRuntimeReady } from '@/server/runtime';
import { ok, serverError } from '@/server/http';

export async function GET() {
  try {
    await ensureRuntimeReady();
    await db.$queryRaw`SELECT 1`;

    return ok({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError((error as Error).message);
  }
}
