interface ProfileEntry {
  operation: string;
  durationMs: number;
  thresholdMs: number;
  violated: boolean;
  timestamp: string;
}

const slowOperations: ProfileEntry[] = [];
const MAX_ENTRIES = 1000;

const thresholds: Record<string, number> = {
  pipeline: 500,
  stage: 100,
  observer: 50,
  registry_lookup: 1,
  executive_decision: 200,
};

export const RuntimeProfiler = {
  setThreshold(operation: string, ms: number): void { thresholds[operation] = ms; },

  getThreshold(operation: string): number { return thresholds[operation] ?? Infinity; },

  record(operation: string, durationMs: number): void {
    const threshold = this.getThreshold(operation);
    const violated = durationMs > threshold;
    slowOperations.push({ operation, durationMs, thresholdMs: threshold, violated, timestamp: new Date().toISOString() });
    if (slowOperations.length > MAX_ENTRIES) slowOperations.shift();
  },

  getSlowOperations(minDuration?: number): ProfileEntry[] {
    if (minDuration) return slowOperations.filter(e => e.durationMs >= minDuration);
    return slowOperations.filter(e => e.violated);
  },

  getViolations(): ProfileEntry[] { return slowOperations.filter(e => e.violated); },

  getSummary(): Record<string, { count: number; avgMs: number; maxMs: number; violations: number }> {
    const groups: Record<string, { durations: number[]; violations: number }> = {};
    for (const e of slowOperations) {
      if (!groups[e.operation]) groups[e.operation] = { durations: [], violations: 0 };
      groups[e.operation].durations.push(e.durationMs);
      if (e.violated) groups[e.operation].violations++;
    }
    const result: Record<string, { count: number; avgMs: number; maxMs: number; violations: number }> = {};
    for (const [op, data] of Object.entries(groups)) {
      result[op] = {
        count: data.durations.length,
        avgMs: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length),
        maxMs: Math.max(...data.durations),
        violations: data.violations,
      };
    }
    return result;
  },

  clear(): void { slowOperations.length = 0; },
};
