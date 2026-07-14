import type Redis from "ioredis";

export class RedisCache {
  constructor(private getClient: () => Redis | null) {}

  private isAvailable(): boolean {
    const client = this.getClient();
    return client !== null && client.status === "ready";
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const raw = await this.getClient()!.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error("[RedisCache] get error:", (err as Error).message);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const raw = JSON.stringify(value);
      if (ttlSeconds) {
        await this.getClient()!.setex(key, ttlSeconds, raw);
      } else {
        await this.getClient()!.set(key, raw);
      }
    } catch (err) {
      console.error("[RedisCache] set error:", (err as Error).message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.getClient()!.del(key);
    } catch (err) {
      console.error("[RedisCache] del error:", (err as Error).message);
    }
  }

  async remember<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const client = this.getClient()!;
      const stream = client.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream) {
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }
    } catch (err) {
      console.error("[RedisCache] delByPattern error:", (err as Error).message);
    }
  }
}
