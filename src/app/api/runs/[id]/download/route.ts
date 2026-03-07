import { createReadStream } from 'fs';
import { stat, rm } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { BackupService } from '@/server/services/backup-service';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { unauthorized, notFound, serverError } from '@/server/http';

const TEMP_DOWNLOAD_ROOT = process.env.BACKUP_DOWNLOAD_WORKDIR ?? '/tmp/vaultdocker-work/downloads';

const service = new BackupService();

function ensureTarName(name: string): string {
  return name.endsWith('.tar.gz') ? name : `${name}.tar.gz`;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAuthUser();

    const { id } = await params;
    const run = await service.getRun(id);

    if (!run) {
      return notFound('Backup run not found.');
    }

    let sourceArchivePath = run.archivePath;
    let tempDirectory: string | null = null;

    if (!sourceArchivePath && run.storagePath) {
      const safeName = ensureTarName(run.backupName ?? `backup-${run.id}`);
      tempDirectory = path.join(TEMP_DOWNLOAD_ROOT, `${run.id}-${randomUUID()}`);
      sourceArchivePath = path.join(tempDirectory, safeName);

      await service.downloadRunToLocal(run.id, sourceArchivePath);
    }

    if (!sourceArchivePath) {
      return notFound('Archive not found for this run.');
    }

    const fileInfo = await stat(sourceArchivePath);
    const nodeStream = createReadStream(sourceArchivePath);
    const cleanupDir = tempDirectory;

    if (cleanupDir) {
      nodeStream.on('close', () => {
        rm(cleanupDir, { recursive: true, force: true }).catch(() => undefined);
      });
      nodeStream.on('error', () => {
        rm(cleanupDir, { recursive: true, force: true }).catch(() => undefined);
      });
    }

    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const downloadName = ensureTarName(run.backupName ?? `backup-${run.id}`);

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': fileInfo.size.toString(),
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
