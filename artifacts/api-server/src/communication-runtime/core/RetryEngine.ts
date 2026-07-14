import { deliveryQueue } from "./DeliveryQueue";

const BACKOFF_INTERVALS = [1000, 5000, 30000, 300000, 1800000];

export const RetryEngine = {
  getBackoff(retryCount: number): number {
    if (retryCount < 0) return BACKOFF_INTERVALS[0];
    if (retryCount >= BACKOFF_INTERVALS.length) return BACKOFF_INTERVALS[BACKOFF_INTERVALS.length - 1];
    return BACKOFF_INTERVALS[retryCount];
  },

  processFailed(): number {
    const failed = deliveryQueue.getAll().filter(t => t.status === "failed" && t.retryCount < t.maxRetries);
    let retried = 0;

    for (const task of failed) {
      const backoff = this.getBackoff(task.retryCount);
      const elapsed = Date.now() - new Date(task.createdAt).getTime();
      if (elapsed >= backoff) {
        deliveryQueue.markFailed(task.id);
        retried++;
      }
    }

    return retried;
  },

  startPolling(intervalMs: number = 5000): NodeJS.Timeout {
    return setInterval(() => {
      this.processFailed();
    }, intervalMs);
  },
};
