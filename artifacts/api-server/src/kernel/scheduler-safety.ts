import { logger } from "../lib/logger";
import { kernelScheduler } from "./kernel-scheduler";

const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30000;

interface SchedulerMetrics {
  executions: number;
  failures: number;
  lastExecutionMs: number;
  lastError?: string;
}

const metricsMap = new Map<string, SchedulerMetrics>();

export function getSchedulerMetrics(name: string): SchedulerMetrics | undefined {
  return metricsMap.get(name);
}

export function getAllSchedulerMetrics(): Record<string, SchedulerMetrics> {
  return Object.fromEntries(metricsMap);
}

export function safeSchedule(
  name: string,
  intervalMs: number,
  fn: () => Promise<void> | void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): void {
  kernelScheduler.schedule(name, intervalMs, async () => {
    const metrics: SchedulerMetrics = metricsMap.get(name) ?? { executions: 0, failures: 0, lastExecutionMs: 0 };
    metricsMap.set(name, metrics);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const start = Date.now();
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Scheduler timeout after ${timeoutMs}ms`)), timeoutMs),
        );
        await Promise.race([Promise.resolve(fn()), timeoutPromise]);
        metrics.executions++;
        metrics.lastExecutionMs = Date.now() - start;
        metrics.lastError = undefined;
        logger.info({ name, durationMs: metrics.lastExecutionMs, attempt }, `Scheduler: ${name} completed`);
        return;
      } catch (err) {
        metrics.failures++;
        metrics.lastError = String(err);
        logger.warn({ err, name, attempt, maxRetries: MAX_RETRIES }, `Scheduler: ${name} failed (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    logger.error({ name, maxRetries: MAX_RETRIES }, `Scheduler: ${name} exhausted all retries`);
  });
}
