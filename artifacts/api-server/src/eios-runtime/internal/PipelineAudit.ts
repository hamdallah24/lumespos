export interface AuditEntry {
  correlationId?: string;
  stageId: string;
  status: "completed" | "failed" | "skipped" | "cancelled";
  durationMs: number;
  error?: string;
  retryCount?: number;
  timestamp?: string;
}

const auditLog: AuditEntry[] = [];
const MAX_LOG = 1000;

export const PipelineAudit = {
  record(entry: AuditEntry): void {
    auditLog.unshift({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    if (auditLog.length > MAX_LOG) auditLog.length = MAX_LOG;
  },

  getLog(limit = 50): AuditEntry[] {
    return auditLog.slice(0, limit);
  },

  getByStage(stageId: string): AuditEntry[] {
    return auditLog.filter(e => e.stageId === stageId);
  },

  getFailures(): AuditEntry[] {
    return auditLog.filter(e => e.status === "failed");
  },

  clear(): void {
    auditLog.length = 0;
  },
};
