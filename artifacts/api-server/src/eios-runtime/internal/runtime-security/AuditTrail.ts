import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

export type AuditAction =
  | "PERMISSION_DENIED"
  | "TOKEN_ISSUED"
  | "TOKEN_REVOKED"
  | "SECRET_ACCESSED"
  | "SECRET_ROTATED"
  | "CONFIG_CHANGED"
  | "MANIFEST_VERIFIED"
  | "MANIFEST_FAILED"
  | "PLUGIN_LOADED"
  | "PLUGIN_UNLOADED"
  | "EXECUTIVE_PERFORMED"
  | "BOOTSTRAP_STARTED"
  | "BOOTSTRAP_COMPLETED"
  | "SHUTDOWN_INITIATED"
  | "SECURITY_EVENT";

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  subjectId: string;
  details: string;
  metadata?: Record<string, unknown>;
}

const TRAIL: AuditEntry[] = [];

export const AuditTrail = {
  record(action: AuditAction, subjectId: string, details: string, metadata?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      subjectId,
      details,
      metadata,
    };
    TRAIL.push(entry);
    RuntimeLogger.info("AuditTrail", `[${action}] ${subjectId}: ${details}`);
  },

  query(filter?: Partial<AuditEntry>): ReadonlyArray<AuditEntry> {
    if (!filter) return TRAIL;
    return TRAIL.filter(e =>
      Object.entries(filter).every(([k, v]) => (e as any)[k] === v)
    );
  },

  count(): number { return TRAIL.length; },

  clear(): void { TRAIL.length = 0; },
};
