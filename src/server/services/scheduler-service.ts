import cron, { type ScheduledTask } from 'node-cron';
import { BackupJobRepository } from '@/server/repositories/backup-job-repository';
import { BackupService } from '@/server/services/backup-service';

class SchedulerService {
  private readonly jobRepository = new BackupJobRepository();
  private readonly backupService = new BackupService();
  private tasks = new Map<string, ScheduledTask>();
  private started = false;

  async start() {
    if (this.started) {
      return;
    }

    this.started = true;
    await this.reload();
  }

  async reload() {
    for (const task of this.tasks.values()) {
      task.stop();
      task.destroy();
    }
    this.tasks.clear();

    const jobs = await this.jobRepository.listEnabled();

    for (const job of jobs) {
      if (!cron.validate(job.cronExpression)) {
        continue;
      }

      const task = cron.schedule(job.cronExpression, async () => {
        try {
          await this.backupService.runJob(job.id, 'SCHEDULED');
        } catch (error) {
          console.error(`Scheduled run failed for job ${job.id}:`, error);
        }
      });

      this.tasks.set(job.id, task);
    }
  }
}

const schedulerService = new SchedulerService();

export async function ensureSchedulerStarted() {
  await schedulerService.start();
}

export async function reloadScheduler() {
  await schedulerService.reload();
}
