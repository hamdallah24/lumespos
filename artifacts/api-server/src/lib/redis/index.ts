import { RedisConnection } from "./redis-connection";
import { RedisCache } from "./redis-cache";
import { RedisQueue } from "./redis-queue";
import { RedisPubSub } from "./redis-pubsub";
import { RedisLock } from "./redis-lock";
import { isRedisEnabled } from "./redis-config";
import { getRedisHealthReport, redisHealthComponent } from "./redis-health";

class RedisService {
  private _connection: RedisConnection;
  private _cache: RedisCache;
  private _queue: RedisQueue;
  private _pubsub: RedisPubSub;
  private _lock: RedisLock;
  private _initialized = false;

  constructor() {
    this._connection = new RedisConnection();
    this._cache = new RedisCache(() => this._connection.getClient());
    this._queue = new RedisQueue(() => this._connection.getClient());
    this._pubsub = new RedisPubSub(() => this._connection.getClient());
    this._lock = new RedisLock(() => this._connection.getClient());
  }

  async init(): Promise<boolean> {
    if (this._initialized) return true;
    if (!isRedisEnabled()) {
      console.log("[Redis] Skipped — REDIS_HOST not set");
      return false;
    }
    const ok = await this._connection.connect();
    if (!ok) {
      console.warn("[Redis] Init failed — running without Redis");
      return false;
    }
    this._initialized = true;
    return true;
  }

  async shutdown(): Promise<void> {
    await this._pubsub.disconnect();
    await this._connection.disconnect();
    this._initialized = false;
    console.log("[Redis] Shutdown complete");
  }

  get connection() { return this._connection; }
  get cache() { return this._cache; }
  get queue() { return this._queue; }
  get pubsub() { return this._pubsub; }
  get lock() { return this._lock; }
  get initialized() { return this._initialized; }

  async health() {
    return getRedisHealthReport(this._connection, this._cache, this._queue);
  }
}

export const redisService = new RedisService();
export { RedisConnection, RedisCache, RedisQueue, RedisPubSub, RedisLock, redisHealthComponent };
export { isRedisEnabled } from "./redis-config";
export type { RedisHealthReport } from "./redis-health";
