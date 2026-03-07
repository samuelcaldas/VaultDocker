import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { BackupService } from '@/server/services/backup-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { unauthorized, notFound, serverError } from '@/server/http';

const service = new BackupService();

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const run = await service.getRun(id);

    if (!run?.archivePath) {
      return notFound('Archive not found for this run.');
    }

    const fileInfo = await stat(run.archivePath);
    const nodeStream = createReadStream(run.archivePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': fileInfo.size.toString(),
        'Content-Disposition': `attachment; filename="${run.backupName ?? `backup-${run.id}.tar.gz`}"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
