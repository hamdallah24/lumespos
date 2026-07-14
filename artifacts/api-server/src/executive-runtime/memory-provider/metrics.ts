// T.0.2 Phase 7 — Monitoring & metrics for MemoryProvider
// LOCKED: T01_MEMORY_MONITORING.md

interface Counter {
  count: number;
  totalMs: number;
  errors: number;
}

export class MemoryMetrics {
  private reads = new Map<string, Counter>();
  private storeReads = new Map<string, Counter>();
  private l1Hits = 0;
  private l1Misses = 0;
  private l2Hits = 0;
  private l2Misses = 0;
  private circuitOpens = 0;
  private circuitCloses = 0;
  private lastLog = Date.now();

  private getCounter(map: Map<string, Counter>, key: string): Counter {
    let c = map.get(key);
    if (!c) { c = { count: 0, totalMs: 0, errors: 0 }; map.set(key, c); }
    return c;
  }

  recordRead(executive: string, durationMs: number, err: boolean): void {
    const c = this.getCounter(this.reads, executive);
    c.count++;
    c.totalMs += durationMs;
    if (err) c.errors++;
  }

  recordStoreRead(store: string, durationMs: number, err: boolean): void {
    const c = this.getCounter(this.storeReads as any, store);
    c.count++;
    c.totalMs += durationMs;
    if (err) c.errors++;
  }

  recordL1Hit(): void { this.l1Hits++; }
  recordL1Miss(): void { this.l1Misses++; }
  recordL2Hit(): void { this.l2Hits++; }
  recordL2Miss(): void { this.l2Misses++; }
  recordCircuitOpen(): void { this.circuitOpens++; }
  recordCircuitClose(): void { this.circuitCloses++; }

  snapshot(): Record<string, any> {
    const summary: Record<string, any> = {
      totalReads: 0,
      totalErrors: 0,
      avgDurationMs: 0,
      l1HitRate: 0,
      l2HitRate: 0,
      circuitOpens: this.circuitOpens,
      circuitCloses: this.circuitCloses,
    };

    let totalDuration = 0;
    for (const [, c] of this.reads) {
      summary.totalReads += c.count;
      summary.totalErrors += c.errors;
      totalDuration += c.totalMs;
    }
    summary.avgDurationMs = summary.totalReads > 0
      ? Math.round(totalDuration / summary.totalReads) : 0;

    const l1Total = this.l1Hits + this.l1Misses;
    summary.l1HitRate = l1Total > 0 ? this.l1Hits / l1Total : 0;

    const l2Total = this.l2Hits + this.l2Misses;
    summary.l2HitRate = l2Total > 0 ? this.l2Hits / l2Total : 0;

    return summary;
  }

  maybeLog(): void {
    const now = Date.now();
    if (now - this.lastLog < 300_000) return;
    this.lastLog = now;

    const s = this.snapshot();
    console.log(`[MEMORY_METRICS] reads=${s.totalReads} errors=${s.totalErrors} avg=${s.avgDurationMs}ms `
      + `L1=${(s.l1HitRate * 100).toFixed(0)}% L2=${(s.l2HitRate * 100).toFixed(0)}% `
      + `circuitOpens=${s.circuitOpens}`);
  }

  reset(): void {
    this.reads.clear();
    this.storeReads.clear();
    this.l1Hits = 0;
    this.l1Misses = 0;
    this.l2Hits = 0;
    this.l2Misses = 0;
    this.circuitOpens = 0;
    this.circuitCloses = 0;
  }
}

export const memoryMetrics = new MemoryMetrics();
