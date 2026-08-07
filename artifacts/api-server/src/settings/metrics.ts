// ConfigCenter — Internal Metrics.
// Lightweight counters + histograms. No Prometheus/OTel yet — pure in-memory
// snapshot. Consumed by Configuration Health and debugging.

export type MetricCounterKey =
  | "cache_hit"
  | "cache_miss"
  | "published_events"
  | "subscriber_reloads";

export type MetricLatencyKey =
  | "resolver_latency_ms"
  | "commit_latency_ms";

export interface MetricsSnapshot {
  counters: Record<string, number>;
  latencies: Record<string, { count: number; total: number; avg: number; max: number }>;
}

interface LatencyAccumulator {
  count: number;
  total: number;
  max: number;
}

export class ConfigMetrics {
  private counters: Record<string, number> = {};
  private latencies: Record<string, LatencyAccumulator> = {};

  increment(key: MetricCounterKey, by = 1): void {
    this.counters[key] = (this.counters[key] ?? 0) + by;
  }

  // Record a latency value; returns elapsed for convenience.
  time(key: MetricLatencyKey, fn: () => void): void {
    const start = performance.now();
    fn();
    this.record(key, performance.now() - start);
  }

  async timeAsync<T>(key: MetricLatencyKey, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this.record(key, performance.now() - start);
    return result;
  }

  record(key: MetricLatencyKey, ms: number): void {
    const acc = this.latencies[key] ?? { count: 0, total: 0, max: 0 };
    acc.count += 1;
    acc.total += ms;
    acc.max = Math.max(acc.max, ms);
    this.latencies[key] = acc;
  }

  getCounter(key: MetricCounterKey): number {
    return this.counters[key] ?? 0;
  }

  snapshot(): MetricsSnapshot {
    const latencies: MetricsSnapshot["latencies"] = {};
    for (const [key, acc] of Object.entries(this.latencies)) {
      latencies[key] = {
        count: acc.count,
        total: acc.total,
        avg: acc.count > 0 ? acc.total / acc.count : 0,
        max: acc.max,
      };
    }
    return { counters: { ...this.counters }, latencies };
  }
}