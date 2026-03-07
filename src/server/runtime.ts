import { bootstrapSystem } from '@/server/bootstrap';
import { ensureSchedulerStarted } from '@/server/services/scheduler-service';

let initialized = false;

export async function ensureRuntimeReady() {
  if (initialized) {
    return;
  }

  await bootstrapSystem();
  await ensureSchedulerStarted();
  initialized = true;
}
