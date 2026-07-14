import type { Metric } from "./types";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export class MetricStore {
  private metrics = new Map<string, Metric>();
  private ttl: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
  }

  set(metric: Metric): void {
    this.metrics.set(metric.id, metric);
  }

  get(id: string): Metric | undefined {
    const m = this.metrics.get(id);
    if (!m) return undefined;
    if (Date.now() - m.timestamp.getTime() > this.ttl) {
      this.metrics.delete(id);
      return undefined;
    }
    return m;
  }

  getByDomain(domain: string, branchId?: number): Metric[] {
    const result: Metric[] = [];
    const now = Date.now();
    for (const m of this.metrics.values()) {
      if (m.domain !== domain) continue;
      if (branchId !== undefined && m.branchId !== branchId) continue;
      if (now - m.timestamp.getTime() > this.ttl) {
        this.metrics.delete(m.id);
        continue;
      }
      result.push(m);
    }
    return result;
  }

  getByName(name: string, branchId?: number): Metric[] {
    const result: Metric[] = [];
    const now = Date.now();
    for (const m of this.metrics.values()) {
      if (m.name !== name) continue;
      if (branchId !== undefined && m.branchId !== branchId) continue;
      if (now - m.timestamp.getTime() > this.ttl) {
        this.metrics.delete(m.id);
        continue;
      }
      result.push(m);
    }
    return result;
  }

  getLatest(name: string, branchId?: number): Metric | undefined {
    const all = this.getByName(name, branchId);
    if (all.length === 0) return undefined;
    return all.reduce((latest, m) =>
      m.timestamp > latest.timestamp ? m : latest,
    );
  }

  getAll(branchId?: number): Metric[] {
    const result: Metric[] = [];
    const now = Date.now();
    for (const m of this.metrics.values()) {
      if (branchId !== undefined && m.branchId !== branchId) continue;
      if (now - m.timestamp.getTime() > this.ttl) {
        this.metrics.delete(m.id);
        continue;
      }
      result.push(m);
    }
    return result;
  }

  clear(): void {
    this.metrics.clear();
  }

  size(): number {
    this.collectGarbage();
    return this.metrics.size;
  }

  private collectGarbage(): void {
    const now = Date.now();
    for (const [id, m] of this.metrics) {
      if (now - m.timestamp.getTime() > this.ttl) {
        this.metrics.delete(id);
      }
    }
  }
}

export const metricStore = new MetricStore();
