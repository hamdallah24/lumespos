import Redis from "ioredis";
import { RedisConfig, defaultRedisConfig, isRedisEnabled } from "./redis-config";

export class RedisConnection {
  private client: Redis | null = null;
  private config: RedisConfig;
  private _connected = false;

  constructor(config: RedisConfig = defaultRedisConfig) {
    this.config = config;
  }

  private createClient(): Redis {
    const { host, port, password, db, keyPrefix, enableReadyCheck, lazyConnect, maxRetriesPerRequest, retryBaseDelay, retryMaxDelay } = this.config;

    const client = new Redis({
      host,
      port,
      password,
      db,
      keyPrefix,
      enableReadyCheck,
      lazyConnect,
      maxRetriesPerRequest,
      retryStrategy: (attempt: number) => {
        if (attempt > 10) {
          console.error("[Redis] Max retries reached — giving up");
          return null;
        }
        const delay = Math.min(retryBaseDelay * Math.pow(2, attempt - 1) + Math.random() * 100, retryMaxDelay);
        console.warn(`[Redis] Reconnecting attempt ${attempt}/10 in ${Math.round(delay)}ms`);
        return delay;
      },
    });

    client.on("connect", () => {
      console.log("[Redis] Connecting...");
    });

    client.on("ready", () => {
      this._connected = true;
      console.log("[Redis] Connected");
    });

    client.on("error", (err) => {
      console.error("[Redis] Error:", err.message);
    });

    client.on("close", () => {
      this._connected = false;
      console.warn("[Redis] Connection closed");
    });

    client.on("reconnecting", () => {
      console.warn("[Redis] Reconnecting...");
    });

    client.on("end", () => {
      this._connected = false;
      console.warn("[Redis] Connection ended");
    });

    return client;
  }

  async connect(): Promise<boolean> {
    if (!isRedisEnabled()) {
      console.log("[Redis] Disabled — set REDIS_HOST to enable");
      return false;
    }
    if (this._connected) return true;

    try {
      this.client = this.createClient();
      await this.client.connect();
      return true;
    } catch (err) {
      console.error("[Redis] Connection failed:", (err as Error).message);
      this.client = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
    this.client = null;
    this._connected = false;
    console.log("[Redis] Disconnected");
  }

  getClient(): Redis | null {
    return this.client;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async ping(): Promise<boolean> {
    if (!this.client || !this._connected) return false;
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}
