import { randomUUID, createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { BackupRunStatus, ProviderType } from '@prisma/client';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type { StorageProviderConfig } from '@/server/storage/types';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupRunRepository } from '@/server/repositories/backup-run-repository';
import { StorageProviderService } from '@/server/services/storage-provider-service';

const MAX_ATTEMPTS = 3;
const TEMP_ARCHIVE_ROOT = process.env.BACKUP_WORKDIR ?? '/tmp/vaultdocker-work';

type RunWorkspace = {
  directoryPath: string;
  archivePath: string;
  sidecarPath: string;
};

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function ensureTarExtension(name: string): string {
  return name.endsWith('.tar.gz') ? name : `${name}.tar.gz`;
}

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function formatBackupName(template: string, context: { job: string; volume: string; seq: string }) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const timestamp = Math.floor(now.getTime() / 1000).toString();

  const resolved = template
    .replaceAll('{job}', sanitizePathSegment(context.job))
    .replaceAll('{volume}', sanitizePathSegment(context.volume))
    .replaceAll('{date}', date)
    .replaceAll('{time}', time)
    .replaceAll('{timestamp}', timestamp)
    .replaceAll('{seq}', context.seq);

  return ensureTarExtension(resolved);
}

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

export async function computeSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

export async function runArchiveCommand(input: {
  sourcePath: string;
  selectedPaths: string[];
  exclusionGlobs: string[];
  compressionLevel: number;
  archivePath: string;
}): Promise<string> {
  await mkdir(path.dirname(input.archivePath), { recursive: true });

  const selected = input.selectedPaths.length > 0 ? input.selectedPaths : ['.'];
  const excludes = input.exclusionGlobs.filter(Boolean).map((glob) => `--exclude=${glob}`);
  const tarArgs = ['-cf', '-', '-C', input.sourcePath, ...excludes, ...selected];

  const tarProcess = spawn('tar', tarArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  const gzipProcess = spawn('gzip', [`-${input.compressionLevel}`], { stdio: ['pipe', 'pipe', 'pipe'] });
  const output = createWriteStream(input.archivePath);

  let logs = `Running tar ${tarArgs.join(' ')}\n`;
  tarProcess.stderr?.on('data', (chunk) => { logs += `[tar] ${chunk.toString()}`; });
  gzipProcess.stderr?.on('data', (chunk) => { logs += `[gzip] ${chunk.toString()}`; });

  tarProcess.stdout?.pipe(gzipProcess.stdin as NodeJS.WritableStream);
  gzipProcess.stdout?.pipe(output);

  const outputClosed = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', reject);
  });

  await Promise.all([waitForProcess(tarProcess, 'tar'), waitForProcess(gzipProcess, 'gzip'), outputClosed]);
  return logs;
}

export function createWorkspace(id: string): RunWorkspace {
  const directoryPath = path.join(TEMP_ARCHIVE_ROOT, id);
  const archivePath = path.join(directoryPath, 'archive.tar.gz');

  return {
    directoryPath,
    archivePath,
    sidecarPath: `${archivePath}.sha256`,
  };
}

export async function cleanupWorkspace(workspace: RunWorkspace): Promise<void> {
  await rm(workspace.directoryPath, { recursive: true, force: true });
}

export class BackupService {
  private readonly jobRepository: BackupJobRepository;
  private readonly runRepository: BackupRunRepository;
  private readonly storageProviderService: StorageProviderService;

  constructor(
    jobRepo = new BackupJobRepository(),
    runRepo = new BackupRunRepository(),
    storageSvc = new StorageProviderService()
  ) {
    this.jobRepository = jobRepo;
    this.runRepository = runRepo;
    this.storageProviderService = storageSvc;
  }

  async listRuns(input: { jobId?: string; status?: BackupRunStatus; limit?: number } = {}) {
    return this.runRepository.list(input);
  }

  async getRun(id: string) {
    return this.runRepository.findById(id);
  }

  async runJob(jobId: string, trigger: 'MANUAL' | 'SCHEDULED' | 'RESTORE_SAFETY' = 'MANUAL') {
    const job = await this.ensureJobExists(jobId);
    const context = await this.prepareJobContext(job);
    const run = await this.runRepository.create({
      jobId: job.id,
      trigger,
      status: BackupRunStatus.RUNNING,
      logs: `Starting backup for job ${job.name}...\n`,
    });

    const workspace = createWorkspace(run.id);
    await mkdir(workspace.directoryPath, { recursive: true });

    return this.executeAttempts(job, run, workspace, context);
  }

  private async ensureJobExists(jobId: string) {
    const job = await this.jobRepository.findByIdWithRelations(jobId);
    if (!job) {
      throw new Error('Backup job not found.');
    }
    return job;
  }

  private async prepareJobContext(job: any) {
    const adapter = this.storageProviderService.getAdapter(job.storageProvider.type);
    const storageConfig = this.storageProviderService.decodeConfig(job.storageProvider);
    const successfulRuns = await this.runRepository.listSuccessfulByJob(job.id);
    const sequence = String(successfulRuns.length + 1).padStart(3, '0');
    
    const backupName = formatBackupName(job.nameFormat, {
      job: job.name,
      volume: job.volume.dockerName,
      seq: sequence,
    });

    return { adapter, storageConfig, backupName };
  }

  private async executeAttempts(job: any, run: any, workspace: RunWorkspace, context: any) {
    let combinedLogs = run.logs ?? '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        combinedLogs += `Attempt ${attempt}/${MAX_ATTEMPTS}\n`;
        return await this.performSingleAttempt(job, run, workspace, context, combinedLogs);
      } catch (error) {
        combinedLogs = await this.handleAttemptFailure(error, attempt, run, workspace, combinedLogs);
      }
    }
    throw new Error('Backup failed after maximum attempts.');
  }

  private async performSingleAttempt(job: any, run: any, workspace: RunWorkspace, context: any, logs: string) {
    const archiveLogs = await this.executeArchiveCommand(job, workspace);
    const updatedLogs = logs + archiveLogs;
    
    const uploadedArchive = await this.uploadArtifacts(workspace, context);
    
    await this.markRunSuccess(job, run, workspace, context, uploadedArchive, updatedLogs);
    await this.applyRetention(job.id, job.retentionCount, context.adapter, context.storageConfig);
    await cleanupWorkspace(workspace);

    return this.runRepository.findById(run.id);
  }

  private async executeArchiveCommand(job: any, workspace: RunWorkspace) {
    const selectedPaths = Array.isArray(job.selectedPaths) ? job.selectedPaths.filter((e): e is string => typeof e === 'string') : [];
    const exclusionGlobs = Array.isArray(job.exclusionGlobs) ? job.exclusionGlobs.filter((e): e is string => typeof e === 'string') : [];

    return runArchiveCommand({
      sourcePath: job.volume.mountPath,
      selectedPaths,
      exclusionGlobs,
      compressionLevel: job.compressionLevel,
      archivePath: workspace.archivePath,
    });
  }

  private async uploadArtifacts(workspace: RunWorkspace, context: any) {
    const checksum = await computeSha256(workspace.archivePath);
    await writeFile(workspace.sidecarPath, `${checksum}  ${context.backupName}\n`, 'utf8');

    const uploadedArchive = await context.adapter.upload(context.storageConfig, {
      localPath: workspace.archivePath,
      remotePath: context.backupName,
    });

    await context.adapter.upload(context.storageConfig, {
      localPath: workspace.sidecarPath,
      remotePath: `${context.backupName}.sha256`,
    });

    return { ...uploadedArchive, checksum };
  }

  private async markRunSuccess(job: any, run: any, workspace: RunWorkspace, context: any, uploadedArchive: any, logs: string) {
    const fileStat = await stat(workspace.archivePath);

    await this.runRepository.update(run.id, {
      status: BackupRunStatus.SUCCESS,
      finishedAt: new Date(),
      archivePath: null,
      storagePath: uploadedArchive.storagePath,
      fileSizeBytes: BigInt(fileStat.size),
      checksum: uploadedArchive.checksum,
      logs: `${logs}Backup completed successfully.\n`,
      backupName: context.backupName,
    });

    await this.jobRepository.update(job.id, { lastRunAt: new Date() });
  }

  private async handleAttemptFailure(error: unknown, attempt: number, run: any, workspace: RunWorkspace, logs: string): Promise<string> {
    const message = (error as Error).message;
    const newLogs = logs + `Attempt ${attempt} failed: ${message}\n`;

    await cleanupWorkspace(workspace);
    await this.delayOrFail(attempt, run, newLogs, message, workspace);
    return newLogs;
  }

  private async delayOrFail(attempt: number, run: any, logs: string, message: string, workspace: RunWorkspace) {
    if (attempt >= MAX_ATTEMPTS) {
      await this.runRepository.update(run.id, {
        status: BackupRunStatus.FAILED,
        finishedAt: new Date(),
        logs,
        errorMessage: message,
      });
      throw new Error(message);
    }
    const waitMs = 2 ** attempt * 1000;
    await mkdir(workspace.directoryPath, { recursive: true });
    await sleep(waitMs);
  }

  async createSafetyBackup(input: {
    sourcePath: string;
    volumeName: string;
    jobName: string;
    providerType: ProviderType;
    storageConfig: StorageProviderConfig;
  }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyName = `safety_${sanitizePathSegment(input.jobName)}_${sanitizePathSegment(input.volumeName)}_${timestamp}.tar.gz`;
    const workspace = createWorkspace(`safety-${randomUUID()}`);

    await mkdir(workspace.directoryPath, { recursive: true });

    try {
      return await this.executeSafetyBackup(input, workspace, safetyName);
    } catch (error) {
      await cleanupWorkspace(workspace);
      throw error;
    }
  }

  private async executeSafetyBackup(input: any, workspace: RunWorkspace, safetyName: string) {
    await runArchiveCommand({
      sourcePath: input.sourcePath,
      selectedPaths: ['.'],
      exclusionGlobs: [],
      compressionLevel: 6,
      archivePath: workspace.archivePath,
    });

    const checksum = await computeSha256(workspace.archivePath);
    await writeFile(workspace.sidecarPath, `${checksum}  ${safetyName}\n`, 'utf8');

    const adapter = this.storageProviderService.getAdapter(input.providerType);
    const uploadedArchive = await adapter.upload(input.storageConfig, {
      localPath: workspace.archivePath,
      remotePath: safetyName,
    });

    await adapter.upload(input.storageConfig, {
      localPath: workspace.sidecarPath,
      remotePath: `${safetyName}.sha256`,
    });

    await cleanupWorkspace(workspace);

    return {
      storagePath: uploadedArchive.storagePath,
      checksum,
    };
  }

  async downloadRunToLocal(runId: string, localPath: string) {
    const run = await this.runRepository.findById(runId);
    if (!run?.storagePath) {
      throw new Error('Backup storage path not found for this run.');
    }

    const job = await this.ensureJobExists(run.jobId);
    const storageConfig = this.storageProviderService.decodeConfig(job.storageProvider);
    const adapter = this.storageProviderService.getAdapter(job.storageProvider.type);

    await adapter.download(storageConfig, {
      remotePath: run.storagePath,
      localPath,
    });

    return { run, job };
  }

  private async applyRetention(jobId: string, retentionCount: number, adapter: StorageAdapter, storageConfig: StorageProviderConfig) {
    const keep = Math.max(1, retentionCount);
    const successfulRuns = await this.runRepository.listSuccessfulByJob(jobId);
    const staleRuns = successfulRuns.slice(keep);

    for (const stale of staleRuns) {
      await this.cleanupStaleRun(stale, adapter, storageConfig);
    }
  }

  private async cleanupStaleRun(stale: any, adapter: StorageAdapter, storageConfig: StorageProviderConfig) {
    if (stale.storagePath) {
      await adapter.delete(storageConfig, { remotePath: stale.storagePath }).catch(() => undefined);
      await adapter.delete(storageConfig, { remotePath: `${stale.storagePath}.sha256` }).catch(() => undefined);
    }
    if (stale.archivePath) {
      await rm(stale.archivePath, { force: true }).catch(() => undefined);
    }
    await this.runRepository.delete(stale.id);
  }
}
