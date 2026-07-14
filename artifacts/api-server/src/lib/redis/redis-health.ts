import type { RedisConnection } from "./redis-connection";
import type { RedisCache } from "./redis-cache";
import type { RedisQueue } from "./redis-queue";
import { isRedisEnabled } from "./redis-config";

export interface RedisHealthReport {
  enabled: boolean;
  connected: boolean;
  ping: boolean;
  uptime: number;
  queueLengths: Record<string, number>;
}

export async function getRedisHealthReport(
  connection: RedisConnection,
  cache: RedisCache,
  queue: RedisQueue,
): Promise<RedisHealthReport> {
  const report: RedisHealthReport = {
    enabled: isRedisEnabled(),
    connected: connection.isConnected(),
    ping: false,
    uptime: 0,
    queueLengths: {},
  };

  if (!connection.isConnected()) return report;

  try {
    report.ping = await connection.ping();
  } catch { /* ignore */ }

  try {
    const info = await connection.getClient()!.info("server");
    const match = info.match(/uptime_in_seconds:(\d+)/);
    if (match) report.uptime = parseInt(match[1], 10);
  } catch { /* ignore */ }

  // Check queue lengths
  for (const qName of ["knowledge"]) {
    try {
      report.queueLengths[qName] = await queue.length(qName);
    } catch { report.queueLengths[qName] = -1; }
  }

  return report;
}

export const redisHealthComponent = {
  name: "RedisService",
  version: "1.0.0",
  capabilities: ["cache", "queue", "pubsub", "lock"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
