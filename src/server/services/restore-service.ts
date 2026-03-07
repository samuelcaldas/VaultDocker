import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { constants as fsConstants } from 'fs';
import { ProviderType } from '@prisma/client';
import { decryptJson } from '@/server/crypto';
import { BackupRunRepository } from '@/server/repositories/backup-run-repository';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupService } from '@/server/services/backup-service';

type LocalProviderConfig = {
  basePath: string;
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

export class RestoreService {
  private readonly runRepository = new BackupRunRepository();
  private readonly jobRepository = new BackupJobRepository();
  private readonly backupService = new BackupService();

  async restoreRun(runId: string, options: { safetyBackup: boolean }) {
    const run = await this.runRepository.findById(runId);
    if (!run?.archivePath) {
      throw new Error('Backup archive not found for this run.');
    }

    const job = await this.jobRepository.findByIdWithRelations(run.jobId);
    if (!job) {
      throw new Error('Backup job not found.');
    }

    if (job.storageProvider.type !== ProviderType.LOCAL) {
      throw new Error('Only LOCAL storage providers are supported in this release.');
    }

    const localConfig = decryptJson<LocalProviderConfig>(job.storageProvider.configEncrypted);

    await access(run.archivePath, fsConstants.R_OK);

    const actualChecksum = await checksumForFile(run.archivePath);
    if (!run.checksum || run.checksum !== actualChecksum) {
      throw new Error('Checksum verification failed. Restore blocked.');
    }

    await mkdir(job.volume.mountPath, { recursive: true });

    if (options.safetyBackup) {
      await this.backupService.createSafetyBackup({
        sourcePath: job.volume.mountPath,
        destinationDir: localConfig.basePath,
        volumeName: job.volume.dockerName,
      });
    }

    const extract = spawn('tar', ['-xzf', run.archivePath, '-C', job.volume.mountPath], {
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
      sourceArchive: path.basename(run.archivePath),
    };
  }
}
