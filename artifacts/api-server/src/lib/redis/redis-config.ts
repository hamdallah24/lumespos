export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  maxRetriesPerRequest: number | null;
  retryBaseDelay: number;
  retryMaxDelay: number;
}

export const defaultRedisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  keyPrefix: process.env.REDIS_PREFIX || "lumes:",
  enableReadyCheck: true,
  lazyConnect: true,
  maxRetriesPerRequest: null,
  retryBaseDelay: 100,
  retryMaxDelay: 30000,
};

export function isRedisEnabled(): boolean {
  return !!process.env.REDIS_HOST;
}
