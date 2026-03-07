import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { BackupRunStatus, ProviderType } from '@prisma/client';
import { decryptJson } from '@/server/crypto';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupRunRepository } from '@/server/repositories/backup-run-repository';

const MAX_ATTEMPTS = 3;

type LocalProviderConfig = {
  basePath: string;
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function ensureTarExtension(name: string): string {
  return name.endsWith('.tar.gz') ? name : `${name}.tar.gz`;
}

function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function formatBackupName(template: string, context: { job: string; volume: string; seq: string }) {
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

function waitForProcess(process: ReturnType<typeof spawn>, label: string): Promise<void> {
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

async function computeSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

async function runArchiveCommand(input: {
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

  const tarProcess = spawn('tar', tarArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const gzipProcess = spawn('gzip', [`-${input.compressionLevel}`], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const output = createWriteStream(input.archivePath);

  let logs = `Running tar ${tarArgs.join(' ')}\n`;

  tarProcess.stderr?.on('data', (chunk) => {
    logs += `[tar] ${chunk.toString()}`;
  });

  gzipProcess.stderr?.on('data', (chunk) => {
    logs += `[gzip] ${chunk.toString()}`;
  });

  tarProcess.stdout?.pipe(gzipProcess.stdin as NodeJS.WritableStream);
  gzipProcess.stdout?.pipe(output);

  const outputClosed = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', reject);
  });

  await Promise.all([waitForProcess(tarProcess, 'tar'), waitForProcess(gzipProcess, 'gzip'), outputClosed]);

  return logs;
}

export class BackupService {
  private readonly jobRepository = new BackupJobRepository();
  private readonly runRepository = new BackupRunRepository();

  async listRuns(input: { jobId?: string; status?: BackupRunStatus; limit?: number } = {}) {
    return this.runRepository.list(input);
  }

  async getRun(id: string) {
    return this.runRepository.findById(id);
  }

  async runJob(jobId: string, trigger: 'MANUAL' | 'SCHEDULED' | 'RESTORE_SAFETY' = 'MANUAL') {
    const job = await this.jobRepository.findByIdWithRelations(jobId);
    if (!job) {
      throw new Error('Backup job not found.');
    }

    if (job.storageProvider.type !== ProviderType.LOCAL) {
      throw new Error('Only LOCAL storage providers are supported in this release.');
    }

    const localConfig = decryptJson<LocalProviderConfig>(job.storageProvider.configEncrypted);
    const successfulRuns = await this.runRepository.listSuccessfulByJob(job.id);
    const sequence = String(successfulRuns.length + 1).padStart(3, '0');

    const backupName = formatBackupName(job.nameFormat, {
      job: job.name,
      volume: job.volume.dockerName,
      seq: sequence,
    });

    const archivePath = path.join(localConfig.basePath, backupName);
    const sidecarPath = `${archivePath}.sha256`;

    const run = await this.runRepository.create({
      jobId: job.id,
      trigger,
      status: BackupRunStatus.RUNNING,
      logs: `Starting backup for job ${job.name}...\n`,
    });

    const selectedPaths = Array.isArray(job.selectedPaths) ? job.selectedPaths.filter((entry): entry is string => typeof entry === 'string') : [];
    const exclusionGlobs = Array.isArray(job.exclusionGlobs)
      ? job.exclusionGlobs.filter((entry): entry is string => typeof entry === 'string')
      : [];

    let combinedLogs = run.logs ?? '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        combinedLogs += `Attempt ${attempt}/${MAX_ATTEMPTS}\n`;

        const archiveLogs = await runArchiveCommand({
          sourcePath: job.volume.mountPath,
          selectedPaths,
          exclusionGlobs,
          compressionLevel: job.compressionLevel,
          archivePath,
        });

        combinedLogs += archiveLogs;

        const checksum = await computeSha256(archivePath);
        await writeFile(sidecarPath, `${checksum}  ${path.basename(archivePath)}\n`, 'utf8');

        const fileStat = await stat(archivePath);

        await this.runRepository.update(run.id, {
          status: BackupRunStatus.SUCCESS,
          finishedAt: new Date(),
          archivePath,
          storagePath: archivePath,
          fileSizeBytes: BigInt(fileStat.size),
          checksum,
          logs: `${combinedLogs}Backup completed successfully.\n`,
          backupName,
        });

        await this.jobRepository.update(job.id, {
          lastRunAt: new Date(),
        });

        await this.applyRetention(job.id, job.retentionCount);

        return this.runRepository.findById(run.id);
      } catch (error) {
        const message = (error as Error).message;
        combinedLogs += `Attempt ${attempt} failed: ${message}\n`;

        await rm(archivePath, { force: true }).catch(() => undefined);
        await rm(sidecarPath, { force: true }).catch(() => undefined);

        if (attempt < MAX_ATTEMPTS) {
          const waitMs = 2 ** attempt * 1000;
          combinedLogs += `Retrying in ${waitMs}ms...\n`;
          await sleep(waitMs);
          continue;
        }

        await this.runRepository.update(run.id, {
          status: BackupRunStatus.FAILED,
          finishedAt: new Date(),
          logs: combinedLogs,
          errorMessage: message,
        });

        throw error;
      }
    }

    throw new Error('Backup failed after maximum attempts.');
  }

  async createSafetyBackup(input: { sourcePath: string; destinationDir: string; volumeName: string }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyName = `safety_${sanitizePathSegment(input.volumeName)}_${timestamp}.tar.gz`;
    const archivePath = path.join(input.destinationDir, safetyName);

    await runArchiveCommand({
      sourcePath: input.sourcePath,
      selectedPaths: ['.'],
      exclusionGlobs: [],
      compressionLevel: 6,
      archivePath,
    });

    return archivePath;
  }

  private async applyRetention(jobId: string, retentionCount: number) {
    const keep = Math.max(1, retentionCount);
    const successfulRuns = await this.runRepository.listSuccessfulByJob(jobId);

    const staleRuns = successfulRuns.slice(keep);

    for (const stale of staleRuns) {
      if (stale.archivePath) {
        await rm(stale.archivePath, { force: true }).catch(() => undefined);
        await rm(`${stale.archivePath}.sha256`, { force: true }).catch(() => undefined);
      }

      await this.runRepository.delete(stale.id);
    }
  }
}
