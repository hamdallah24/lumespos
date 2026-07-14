import { PipelineMetrics as InternalPipelineMetrics } from "./internal/PipelineMetrics";

export interface PipelineMetricsSnapshot {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDurationMs: number;
  successRate: number;
  pendingExecutions: number;
  queueSize: number;
  executionsByTrigger: Record<string, number>;
}

let _pending = 0;

export function recordExecution(result: { success: boolean; trigger: string; durationMs: number; stages: string[] }): void {
  InternalPipelineMetrics.recordExecution({ success: result.success, trigger: result.trigger, durationMs: result.durationMs, stages: result.stages.map(s => ({ type: "stage" as const, namespace: "eios.core", name: s, version: { major: 1, minor: 0, patch: 0 } })) });
}

export function incrementPending(): void { _pending++; }
export function decrementPending(): void { if (_pending > 0) _pending--; }
export function getPendingCount(): number { return _pending; }

export function getMetrics(): PipelineMetricsSnapshot {
  const m = InternalPipelineMetrics.getMetrics();
  return {
    totalExecutions: m.totalExecutions,
    successfulExecutions: m.successfulExecutions,
    failedExecutions: m.failedExecutions,
    averageDurationMs: m.averageDurationMs,
    successRate: m.successRate,
    pendingExecutions: _pending,
    queueSize: 0,
    executionsByTrigger: m.executionsByTrigger,
  };
}

export function clearMetrics(): void {
  InternalPipelineMetrics.clear();
}
