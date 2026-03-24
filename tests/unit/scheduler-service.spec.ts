import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulerService } from '@/server/services/scheduler-service';
import cron from 'node-cron';

vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn(),
    schedule: vi.fn(),
  },
}));

describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  let mockJobRepo: any;
  let mockBackupService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockJobRepo = {
      listEnabled: vi.fn().mockResolvedValue([]),
    };
    mockBackupService = {
      runJob: vi.fn().mockResolvedValue(undefined),
    };
    scheduler = new SchedulerService(mockJobRepo, mockBackupService);
  });

  it('should start and reload jobs', async () => {
    await scheduler.start();
    expect(mockJobRepo.listEnabled).toHaveBeenCalled();
  });

  it('should only start once', async () => {
    await scheduler.start();
    await scheduler.start();
    expect(mockJobRepo.listEnabled).toHaveBeenCalledTimes(1);
  });

  it('should schedule valid jobs', async () => {
    mockJobRepo.listEnabled.mockResolvedValue([
      { id: '1', cronExpression: '* * * * *' }
    ]);
    vi.mocked(cron.validate).mockReturnValue(true);
    const mockTask = { stop: vi.fn(), destroy: vi.fn() };
    vi.mocked(cron.schedule).mockReturnValue(mockTask as any);

    await scheduler.reload();

    expect(cron.validate).toHaveBeenCalledWith('* * * * *');
    expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
  });

  it('should ignore invalid jobs', async () => {
    mockJobRepo.listEnabled.mockResolvedValue([
      { id: '2', cronExpression: 'invalid' }
    ]);
    vi.mocked(cron.validate).mockReturnValue(false);

    await scheduler.reload();

    expect(cron.validate).toHaveBeenCalledWith('invalid');
    expect(cron.schedule).not.toHaveBeenCalled();
  });
});
