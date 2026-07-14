import { PipelineAudit as InternalPipelineAudit } from "./internal/PipelineAudit";

export interface PipelineAuditEntry {
  correlationId: string;
  trigger: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  stages: string[];
  status: string;
  failureCount: number;
  retryCount: number;
  situationCount: number;
  planCount: number;
}

export function recordAuditEntry(_entry: PipelineAuditEntry): void {
  InternalPipelineAudit.record({ stageId: _entry.correlationId || "unknown", status: _entry.status as any, durationMs: _entry.durationMs || 0 });
}

export function recordAudit(stageId: string, status: string, durationMs: number): void {
  InternalPipelineAudit.record({ stageId, status: status as any, durationMs });
}

export function getAuditLog(limit = 50): PipelineAuditEntry[] {
  return InternalPipelineAudit.getLog(limit).map(e => ({
    correlationId: e.correlationId || "",
    trigger: "",
    startedAt: e.timestamp || "",
    completedAt: undefined,
    durationMs: e.durationMs,
    stages: [e.stageId],
    status: e.status,
    failureCount: e.error ? 1 : 0,
    retryCount: e.retryCount || 0,
    situationCount: 0,
    planCount: 0,
  }));
}

export function getAuditByCorrelationId(_id: string): PipelineAuditEntry | undefined {
  return getAuditLog(1000).find(e => e.correlationId === _id);
}

export function clearAuditLog(): void {
  InternalPipelineAudit.clear();
}
