interface BulkheadPool {
  maxConcurrent: number;
  active: number;
  queue: Array<{ resolve: (v: void) => void; reject: (e: unknown) => void; task: () => Promise<void> }>;
}

const pools = new Map<string, BulkheadPool>();

function processPool(name: string): void {
  const pool = pools.get(name);
  if (!pool) return;
  while (pool.queue.length > 0 && pool.active < pool.maxConcurrent) {
    const item = pool.queue.shift()!;
    pool.active++;
    item.task()
      .then(item.resolve, item.reject)
      .finally(() => { pool.active--; processPool(name); });
  }
}

export const BulkheadManager = {
  createPool(name: string, maxConcurrent: number): void {
    if (pools.has(name)) return;
    pools.set(name, { maxConcurrent, active: 0, queue: [] });
  },

  async execute<T>(poolName: string, task: () => Promise<T>): Promise<T> {
    const pool = pools.get(poolName) || { maxConcurrent: Infinity, active: 0, queue: [] };
    if (pool.active >= pool.maxConcurrent) {
      return new Promise<T>((resolve, reject) => {
        pool.queue.push({ resolve: resolve as (v: void) => void, reject, task: task as () => Promise<void> });
        processPool(poolName);
      });
    }
    pool.active++;
    try { return await task(); } finally { pool.active--; processPool(poolName); }
  },

  getStats(name: string): { active: number; queued: number; maxConcurrent: number } | null {
    const pool = pools.get(name);
    if (!pool) return null;
    return { active: pool.active, queued: pool.queue.length, maxConcurrent: pool.maxConcurrent };
  },

  getAllStats(): Record<string, { active: number; queued: number; maxConcurrent: number }> {
    const result: Record<string, { active: number; queued: number; maxConcurrent: number }> = {};
    for (const [name, pool] of pools) result[name] = { active: pool.active, queued: pool.queue.length, maxConcurrent: pool.maxConcurrent };
    return result;
  },
};
