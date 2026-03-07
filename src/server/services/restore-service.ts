import { randomUUID, createHash } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, rm } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { constants as fsConstants } from 'fs';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupRunRepository } from '@/server/repositories/backup-run-repository';
import { BackupService } from '@/server/services/backup-service';
import { StorageProviderService } from '@/server/services/storage-provider-service';

const TEMP_RESTORE_ROOT = process.env.BACKUP_RESTORE_WORKDIR ?? '/tmp/vaultdocker-work/restore';

type RestoreArchiveLocation = {
  archivePath: string;
  cleanupDir: string | null;
};

async function waitForProcess(process: ReturnType<typeof spawn>, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.on('error', (error) => {
      reject(new Error(`${label} failed: ${error.message}`));
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? 'null'}`));
    });
  });
}

async function checksumForFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function ensureTarName(name: string): string {
  return name.endsWith('.tar.gz') ? name : `${name}.tar.gz`;
}

export class RestoreService {
  private readonly runRepository = new BackupRunRepository();
  private readonly jobRepository = new BackupJobRepository();
  private readonly backupService = new BackupService();
  private readonly storageProviderService = new StorageProviderService();

  async restoreRun(runId: string, options: { safetyBackup: boolean }) {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new Error('Backup run not found.');
    }

    const job = await this.jobRepository.findByIdWithRelations(run.jobId);
    if (!job) {
      throw new Error('Backup job not found.');
    }

    const archive = await this.resolveArchive(run.id, run.storagePath, run.archivePath, run.backupName);

    try {
      const actualChecksum = await checksumForFile(archive.archivePath);
      if (run.checksum && run.checksum !== actualChecksum) {
        throw new Error('Checksum verification failed. Restore blocked.');
      }

      await mkdir(job.volume.mountPath, { recursive: true });

      if (options.safetyBackup) {
        const storageConfig = this.storageProviderService.decodeConfig(job.storageProvider);

        await this.backupService.createSafetyBackup({
          sourcePath: job.volume.mountPath,
          volumeName: job.volume.dockerName,
          jobName: job.name,
          providerType: job.storageProvider.type,
          storageConfig,
        });
      }

      const extract = spawn('tar', ['-xzf', archive.archivePath, '-C', job.volume.mountPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let logs = '';
      extract.stdout?.on('data', (chunk) => {
        logs += chunk.toString();
      });
      extract.stderr?.on('data', (chunk) => {
        logs += chunk.toString();
      });

      await waitForProcess(extract, 'restore-tar');

      return {
        ok: true,
        checksum: actualChecksum,
        logs,
        restoredTo: job.volume.mountPath,
        sourceArchive: path.basename(archive.archivePath),
      };
    } finally {
      if (archive.cleanupDir) {
        await rm(archive.cleanupDir, { recursive: true, force: true });
      }
    }
  }

  private async resolveArchive(
    runId: string,
    storagePath: string | null,
    archivePath: string | null,
    backupName: string | null,
  ): Promise<RestoreArchiveLocation> {
    if (storagePath) {
      const tempDir = path.join(TEMP_RESTORE_ROOT, `${runId}-${randomUUID()}`);
      const targetName = ensureTarName(backupName ?? `run-${runId}`);
      const tempArchivePath = path.join(tempDir, targetName);

      await mkdir(tempDir, { recursive: true });
      await this.backupService.downloadRunToLocal(runId, tempArchivePath);
      await access(tempArchivePath, fsConstants.R_OK);

      return {
        archivePath: tempArchivePath,
        cleanupDir: tempDir,
      };
    }

    if (!archivePath) {
      throw new Error('Backup archive not found for this run.');
    }

    await access(archivePath, fsConstants.R_OK);

    return {
      archivePath,
      cleanupDir: null,
    };
  }
}
