import type { ComponentId } from "../contracts/ComponentId";

interface StageMetric {
  stageId: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

interface ExecutionRecord {
  success: boolean;
  trigger: string;
  durationMs: number;
  stages: ComponentId[];
  timestamp: string;
}

const stageHistory: StageMetric[] = [];
const executionHistory: ExecutionRecord[] = [];
const MAX_HISTORY = 1000;
const MAX_STAGE_HISTORY = 5000;
let executionCounter = 0;

export const PipelineMetrics = {
  recordStage(stageId: string, durationMs: number, success: boolean): void {
    stageHistory.push({ stageId, durationMs, success, timestamp: new Date().toISOString() });
    if (stageHistory.length > MAX_STAGE_HISTORY) stageHistory.shift();
  },

  recordExecution(record: Omit<ExecutionRecord, 'timestamp'>): void {
    executionHistory.push({ ...record, timestamp: new Date().toISOString() });
    if (executionHistory.length > MAX_HISTORY) executionHistory.shift();
    executionCounter++;
  },

  getMetrics() {
    const total = executionHistory.length;
    const successes = executionHistory.filter(r => r.success).length;
    const failures = executionHistory.filter(r => !r.success).length;
    const totalDuration = executionHistory.reduce((s, r) => s + r.durationMs, 0);

    const executionsByTrigger: Record<string, number> = {};
    for (const r of executionHistory) {
      executionsByTrigger[r.trigger] = (executionsByTrigger[r.trigger] || 0) + 1;
    }

    const stageStats: Record<string, { total: number; failures: number; avgMs: number }> = {};
    for (const s of stageHistory) {
      if (!stageStats[s.stageId]) stageStats[s.stageId] = { total: 0, failures: 0, avgMs: 0 };
      stageStats[s.stageId].total++;
      if (!s.success) stageStats[s.stageId].failures++;
      stageStats[s.stageId].avgMs = (
        stageStats[s.stageId].avgMs * (stageStats[s.stageId].total - 1) + s.durationMs
      ) / stageStats[s.stageId].total;
    }

    return {
      totalExecutions: executionCounter,
      successfulExecutions: successes,
      failedExecutions: failures,
      averageDurationMs: total > 0 ? Math.round(totalDuration / total) : 0,
      successRate: total > 0 ? Math.round((successes / total) * 100) : 100,
      executionsByTrigger,
      stageStats,
      stageHistoryCount: stageHistory.length,
    };
  },

  clear(): void {
    stageHistory.length = 0;
    executionHistory.length = 0;
    executionCounter = 0;
  },
};
