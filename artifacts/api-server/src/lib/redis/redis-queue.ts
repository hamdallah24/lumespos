import type Redis from "ioredis";

type QueueHandler<T = unknown> = (item: T) => void | Promise<void>;

export class RedisQueue {
  private consumers = new Map<string, boolean>();

  constructor(private getClient: () => Redis | null) {}

  private isAvailable(): boolean {
    const client = this.getClient();
    return client !== null && client.status === "ready";
  }

  async push(queue: string, item: unknown): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const raw = JSON.stringify(item);
      await this.getClient()!.lpush(queue, raw);
    } catch (err) {
      console.error(`[RedisQueue] push error (${queue}):`, (err as Error).message);
    }
  }

  async pop<T>(queue: string, timeout = 0): Promise<{ key: string; item: T } | null> {
    if (!this.isAvailable()) return null;
    try {
      const result = timeout > 0
        ? await this.getClient()!.brpop(queue, timeout)
        : await this.getClient()!.rpop(queue);
      if (!result) return null;
      const [key, raw] = Array.isArray(result) ? result : [queue, result];
      return { key, item: JSON.parse(raw) as T };
    } catch (err) {
      console.error(`[RedisQueue] pop error (${queue}):`, (err as Error).message);
      return null;
    }
  }

  async length(queue: string): Promise<number> {
    if (!this.isAvailable()) return 0;
    try {
      return await this.getClient()!.llen(queue);
    } catch {
      return 0;
    }
  }

  subscribe<T>(queue: string, handler: QueueHandler<T>, pollInterval = 1000): () => void {
    if (this.consumers.get(queue)) {
      console.warn(`[RedisQueue] Consumer already registered for ${queue}`);
      return () => {};
    }
    this.consumers.set(queue, true);

    let running = true;
    const loop = async () => {
      while (running) {
        if (!this.isAvailable()) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        try {
          const result = await this.pop<T>(queue, 1);
          if (result) {
            await handler(result.item);
          }
        } catch (err) {
          console.error(`[RedisQueue] subscribe error (${queue}):`, (err as Error).message);
        }
      }
    };
    loop();

    return () => {
      running = false;
      this.consumers.delete(queue);
    };
  }

  async clear(queue: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.getClient()!.del(queue);
    } catch (err) {
      console.error(`[RedisQueue] clear error (${queue}):`, (err as Error).message);
    }
  }
}
