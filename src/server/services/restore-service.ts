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

export async function waitForProcess(process: ReturnType<typeof spawn>, label: string): Promise<void> {
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

export async function checksumForFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

export function ensureTarName(name: string): string {
  return name.endsWith('.tar.gz') ? name : `${name}.tar.gz`;
}

export class RestoreService {
  private readonly runRepository: BackupRunRepository;
  private readonly jobRepository: BackupJobRepository;
  private readonly backupService: BackupService;
  private readonly storageProviderService: StorageProviderService;

  constructor(
    runRepo = new BackupRunRepository(),
    jobRepo = new BackupJobRepository(),
    backupSvc = new BackupService(),
    storageSvc = new StorageProviderService()
  ) {
    this.runRepository = runRepo;
    this.jobRepository = jobRepo;
    this.backupService = backupSvc;
    this.storageProviderService = storageSvc;
  }

  async restoreRun(runId: string, options: { safetyBackup: boolean }) {
    const run = await this.ensureRunExists(runId);
    const job = await this.ensureJobExists(run.jobId);
    const archive = await this.resolveArchive(run.id, run.storagePath, run.archivePath, run.backupName);

    try {
      await this.verifyChecksum(run.checksum, archive.archivePath);
      await mkdir(job.volume.mountPath, { recursive: true });
      await this.performSafetyBackup(options.safetyBackup, job);

      const logs = await this.extractArchive(archive.archivePath, job.volume.mountPath);

      return {
        ok: true,
        checksum: await checksumForFile(archive.archivePath),
        logs,
        restoredTo: job.volume.mountPath,
        sourceArchive: path.basename(archive.archivePath),
      };
    } finally {
      await this.cleanupTempArchive(archive.cleanupDir);
    }
  }

  private async ensureRunExists(runId: string) {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new Error('Backup run not found.');
    }
    return run;
  }

  private async ensureJobExists(jobId: string) {
    const job = await this.jobRepository.findByIdWithRelations(jobId);
    if (!job) {
      throw new Error('Backup job not found.');
    }
    return job;
  }

  private async verifyChecksum(expectedChecksum: string | null, archivePath: string) {
    const actualChecksum = await checksumForFile(archivePath);
    if (expectedChecksum && expectedChecksum !== actualChecksum) {
      throw new Error('Checksum verification failed. Restore blocked.');
    }
  }

  private async performSafetyBackup(safetyBackup: boolean, job: any) {
    if (!safetyBackup) {
      return;
    }
    
    const storageConfig = this.storageProviderService.decodeConfig(job.storageProvider);
    await this.backupService.createSafetyBackup({
      sourcePath: job.volume.mountPath,
      volumeName: job.volume.dockerName,
      jobName: job.name,
      providerType: job.storageProvider.type,
      storageConfig,
    });
  }

  private async extractArchive(archivePath: string, mountPath: string): Promise<string> {
    const extract = spawn('tar', ['-xzf', archivePath, '-C', mountPath], {
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
    return logs;
  }

  private async cleanupTempArchive(cleanupDir: string | null) {
    if (!cleanupDir) {
      return;
    }
    await rm(cleanupDir, { recursive: true, force: true });
  }

  private async resolveArchive(
    runId: string,
    storagePath: string | null,
    archivePath: string | null,
    backupName: string | null,
  ): Promise<RestoreArchiveLocation> {
    if (storagePath) {
      return this.downloadArchiveFromStorage(runId, backupName);
    }

    return this.ensureLocalArchive(archivePath);
  }

  private async downloadArchiveFromStorage(runId: string, backupName: string | null) {
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

  private async ensureLocalArchive(archivePath: string | null) {
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
