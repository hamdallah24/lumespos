// ConfigCenter — Audit Center types (Milestone 3, Phase 3, additive).

export type ConfigAuditScope = {
  type: string;
  workspaceId: number | null;
  branchId: number | null;
  executiveRole: string | null;
};

// Where an audit event came from. All are read-only aggregations of existing
// authoritative data — nothing here writes a new audit log.
export type AuditOrigin = "revision" | "snapshot" | "gc";

export interface AuditEvent {
  id: string;
  origin: AuditOrigin;
  timestamp: string;
  revision?: number;
  correlationId?: string;
  actor?: string;
  scope?: Record<string, unknown>;
  changedKeys: string[];
  triggerType?: string;
  status?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditTimeline {
  total: number;
  events: AuditEvent[];
}

export interface AuditFilters {
  origin?: AuditOrigin;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AuditSearchQuery {
  actor?: string;
  scopeType?: string;
  revision?: number;
  correlationId?: string;
  snapshotId?: string;
  triggerType?: string;
  status?: string;
  from?: string;
  to?: string;
  configVersion?: number;
}

export interface ChangeDiffEntry {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

export interface PipelineGate {
  stage: string;
  ok: boolean;
  detail?: string;
  data?: unknown;
}

export interface AuditRestoreOrigin {
  snapshotId: string;
  name: string;
  createdAt: string;
  actor?: string;
  reason?: string;
}

export interface AuditSnapshotRef {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  origin?: string;
  triggerType?: string;
}

export interface AuditRevisionDetail {
  revision: number;
  correlationId: string;
  actor: string;
  scope: ConfigAuditScope;
  timestamp: string;
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  diff: ChangeDiffEntry[];
  gates: PipelineGate[];
  snapshots: AuditSnapshotRef[];
  restoreOrigin: AuditRestoreOrigin | null;
  configVersion: number;
  health: Record<string, unknown>;
}

export interface CorrelationNode {
  kind: "change" | "revision" | "snapshot" | "audit" | "event" | "health" | "restore" | "gc";
  label: string;
  data: Record<string, unknown>;
}

export interface CorrelationEdge {
  from: string;
  to: string;
  relation: string;
}

export interface CorrelationGraph {
  correlationId: string;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}