import type Redis from "ioredis";

export class RedisLock {
  constructor(private getClient: () => Redis | null) {}

  private isAvailable(): boolean {
    const client = this.getClient();
    return client !== null && client.status === "ready";
  }

  async acquire(lock: string, ttlSeconds = 30): Promise<boolean> {
    if (!this.isAvailable()) return true;
    try {
      const result = await this.getClient()!.set(lock, "1", "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (err) {
      console.error(`[RedisLock] acquire error (${lock}):`, (err as Error).message);
      return false;
    }
  }

  async release(lock: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.getClient()!.del(lock);
    } catch (err) {
      console.error(`[RedisLock] release error (${lock}):`, (err as Error).message);
    }
  }

  async withLock<T>(lock: string, fn: () => Promise<T>, ttlSeconds = 30): Promise<T | null> {
    const acquired = await this.acquire(lock, ttlSeconds);
    if (!acquired) return null;
    try {
      return await fn();
    } finally {
      await this.release(lock);
    }
  }
}
