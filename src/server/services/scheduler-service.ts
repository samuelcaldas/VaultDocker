import cron, { type ScheduledTask } from 'node-cron';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupService } from '@/server/services/backup-service';

export class SchedulerService {
  private readonly jobRepository: BackupJobRepository;
  private readonly backupService: BackupService;
  private tasks = new Map<string, ScheduledTask>();
  private started = false;

  constructor(
    jobRepository = new BackupJobRepository(),
    backupService = new BackupService()
  ) {
    this.jobRepository = jobRepository;
    this.backupService = backupService;
  }

  async start() {
    if (this.started) {
      return;
    }

    this.started = true;
    await this.reload();
  }

  async reload() {
    this.clearTasks();
    const jobs = await this.jobRepository.listEnabled();
    this.scheduleJobs(jobs);
  }

  private clearTasks() {
    for (const task of this.tasks.values()) {
      task.stop();
      task.destroy();
    }
    this.tasks.clear();
  }

  private scheduleJobs(jobs: { id: string; cronExpression: string }[]) {
    for (const job of jobs) {
      this.scheduleSingleJob(job);
    }
  }

  private scheduleSingleJob(job: { id: string; cronExpression: string }) {
    if (!cron.validate(job.cronExpression)) {
      return;
    }

    const task = cron.schedule(job.cronExpression, () => this.runJobSafe(job.id));
    this.tasks.set(job.id, task);
  }

  private async runJobSafe(jobId: string) {
    try {
      await this.backupService.runJob(jobId, 'SCHEDULED');
    } catch (error) {
      console.error(`Scheduled run failed for job ${jobId}:`, error);
    }
  }
}

const defaultSchedulerService = new SchedulerService();

export async function ensureSchedulerStarted() {
  await defaultSchedulerService.start();
}

export async function reloadScheduler() {
  await defaultSchedulerService.reload();
}
