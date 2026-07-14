export type BackpressureMode = "queue" | "throttle" | "reject" | "degrade";

interface BackpressureConfig {
  mode: BackpressureMode;
  maxQueueSize: number;
  maxConcurrent: number;
  queueTimeoutMs: number;
}

const DEFAULT: BackpressureConfig = {
  mode: "queue",
  maxQueueSize: 100,
  maxConcurrent: 10,
  queueTimeoutMs: 5000,
};

let config: BackpressureConfig = { ...DEFAULT };
let active = 0;
const queue: Array<{ task: () => Promise<void>;
  resolve: (v: void) => void; reject: (e: unknown) => void; enqueuedAt: number }> = [];

function processQueue(): void {
  while (queue.length > 0 && active < config.maxConcurrent) {
    const item = queue.shift()!;
    if (Date.now() - item.enqueuedAt > config.queueTimeoutMs) {
      item.reject(new Error("Backpressure queue timeout"));
      continue;
    }
    active++;
    item.task().finally(() => { active--; processQueue(); }).then(item.resolve, item.reject);
  }
}

export const BackpressureController = {
  configure(cfg: Partial<BackpressureConfig>): void {
    config = { ...config, ...cfg };
  },

  getConfig(): BackpressureConfig { return { ...config }; },

  getActive(): number { return active; },
  getQueued(): number { return queue.length; },

  async execute<T>(task: () => Promise<T>): Promise<T> {
    switch (config.mode) {
      case "reject": {
        if (active >= config.maxConcurrent) throw new Error("Backpressure: max concurrent exceeded");
        active++;
        try { return await task(); } finally { active--; }
      }
      case "throttle": {
        if (queue.length >= config.maxQueueSize) throw new Error("Backpressure: queue full");
        return new Promise<T>((resolve, reject) => {
          queue.push({ task: task as () => Promise<void>, resolve: resolve as (v: void) => void, reject, enqueuedAt: Date.now() });
          processQueue();
        });
      }
      case "queue": {
        if (queue.length >= config.maxQueueSize) throw new Error("Backpressure: queue full");
        return new Promise<T>((resolve, reject) => {
          queue.push({ task: task as () => Promise<void>, resolve: resolve as (v: void) => void, reject, enqueuedAt: Date.now() });
          processQueue();
        });
      }
      case "degrade": {
        if (active >= config.maxConcurrent) return Promise.resolve({ degraded: true } as unknown as T);
        active++;
        try { return await task(); } finally { active--; }
      }
    }
  },
};
