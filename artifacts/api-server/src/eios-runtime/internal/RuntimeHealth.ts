import type { HealthRecord } from "../contracts/HealthContracts";

const history: HealthRecord[] = [];
const MAX_HISTORY = 1000;
let anomalyCount = 0;

export const RuntimeHealth = {
  record(): void {
    history.push({
      timestamp: new Date().toISOString(),
      ...this.score(),
    });
    if (history.length > MAX_HISTORY) history.shift();
  },

  score(): Omit<HealthRecord, "timestamp"> {
    return {
      overall: Math.round(
        (this.scoreDimension("registries") +
         this.scoreDimension("plugins") +
         this.scoreDimension("pipeline") +
         this.scoreDimension("memory") +
         this.scoreDimension("eventBus") +
         this.scoreDimension("dependencies") +
         this.scoreDimension("governance") +
         this.scoreDimension("scheduler")) / 8
      ),
      registries: 100,
      plugins: 100,
      pipeline: this.scoreDimension("pipeline"),
      memory: this.getMemoryScore(),
      eventBus: 100,
      dependencies: 100,
      governance: anomalyCount > 0 ? 85 : 100,
      scheduler: 100,
    };
  },

  scoreDimension(_name: string): number {
    return 100;
  },

  getMemoryScore(): number {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    if (heapTotalMB === 0) return 100;
    const ratio = heapUsedMB / heapTotalMB;
    if (ratio > 0.9) return 50;
    if (ratio > 0.7) return 75;
    return 95;
  },

  getHistory(windowMs?: number): HealthRecord[] {
    if (!windowMs) return [...history];
    const cutoff = Date.now() - windowMs;
    return history.filter(h => new Date(h.timestamp).getTime() > cutoff);
  },

  getTrend(): "improving" | "declining" | "stable" {
    const recent = this.getHistory(300000);
    if (recent.length < 2) return "stable";
    const delta = recent[recent.length - 1].overall - recent[0].overall;
    if (delta > 2) return "improving";
    if (delta < -2) return "declining";
    return "stable";
  },

  recordAnomaly(_type: string): void {
    anomalyCount++;
  },

  clear(): void {
    history.length = 0;
    anomalyCount = 0;
  },
};
