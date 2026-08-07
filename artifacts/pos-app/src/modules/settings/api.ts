// ConfigCenter — SettingsShell API client (pos-app).
// Thin fetch wrapper over /api/v1/settings. Types mirror the backend zod
// schemas (schemas.ts). UI consumes metadata — it never defines config keys.

import { apiFetch } from "@/lib/csrf";

const BASE = "/api/v1/settings";

// ── Wire types (mirror of backend schemas.ts) ─────────────────────────────

export type ConfigScopeType = "default" | "workspace" | "branch" | "executive";
export type ExecutiveRole = "CEO" | "COO" | "CFO" | "CMO" | "CHRO" | "CAIO" | "CKO" | "CTO";
export type ConfigValue = unknown;

export interface ConfigScope {
  type: ConfigScopeType;
  workspaceId?: number | null;
  branchId?: number | null;
  executiveRole?: ExecutiveRole | null;
}

export interface ConfigFieldMeta {
  key: string;
  title: string;
  description?: string;
  category: string;
  type: "string" | "number" | "boolean" | "secret" | "object";
  defaultValue: ConfigValue;
  allowedValues?: Array<string | number>;
  scope: ConfigScopeType[];
  owner?: string;
  restartStrategy?: "hot" | "reload" | "restart" | "manual";
  secret?: boolean;
  immutable?: boolean;
  featureFlag?: boolean;
  experimental?: boolean;
  deprecated?: boolean;
  criticality?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  introducedVersion?: string;
}

export interface ConfigGroup {
  id: string;
  title: string;
  category: string;
  description?: string;
  fields: ConfigFieldMeta[];
}

export interface CatalogResponse {
  version: number;
  checksum: string;
  groups: ConfigGroup[];
}

export interface ResolvedValue {
  key: string;
  value: ConfigValue;
  source: ConfigScope;
  inherited: boolean;
}

export interface FieldDetailResponse {
  field: ConfigFieldMeta;
  resolved: ResolvedValue;
  trace: ResolvedValue[];
}

export interface PlanRequest {
  scope: ConfigScope;
  changes: Record<string, ConfigValue>;
}

export interface PreviewResponse {
  ok: boolean;
  before: Record<string, ConfigValue>;
  after: Record<string, ConfigValue>;
}

export interface SimulateItem {
  key: string;
  estimate: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export interface ImpactResponse {
  impacted: string[];
}

export interface PolicyResponse {
  ok: boolean;
  reason?: string;
  scope: ConfigScope;
  actor: string;
}

export interface CommitResponse {
  ok: boolean;
  revision: number;
  correlationId: string;
  state: string;
  scope: ConfigScope;
  changedKeys: string[];
}

export interface ConfigSnapshot {
  id: string;
  name: string;
  createdAt: string;
  actor: string;
  revision: number;
  scope: ConfigScope;
  changes: Record<string, ConfigValue>;
}

export interface ConfigPackage {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  changes: Record<string, ConfigValue>;
  scope?: ConfigScope;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  registry: { status: string; frozen: boolean; fieldCount: number; groupCount: number; checksum: string };
  store: { status: string; revision: number; overrideCount: number };
  resolver: { status: string; cacheSize: number; lastRevision: number };
  eventBus: { status: string; lastRevision: number; subscriberCount: number };
  capabilities: Record<string, boolean>;
}

// ── Live Health (M3 Phase 2, additive) ─────────────────────────────────────
export type LiveStatus = "ok" | "degraded" | "error";

export interface HealthDiagnostic {
  id: string;
  title: string;
  status: LiveStatus;
  detail: string;
}

export interface HealthSummaryResponse {
  status: LiveStatus;
  updatedAt: string;
  registry: { status: LiveStatus; frozen: boolean; fieldCount: number; groupCount: number; checksum: string };
  store: { status: LiveStatus; revision: number; overrideCount: number };
  resolver: { status: LiveStatus; cacheSize: number; lastRevision: number };
  eventBus: { status: LiveStatus; deliveredRevision: number; storeRevision: number; subscriberCount: number; publishedEvents: number };
  snapshots: {
    count: number;
    retentionCandidates: number;
    policy: { keepLatest: number; keepYoungerThanDays: number };
    lastRestore: ConfigSnapshot | null;
  };
  capabilities: Record<string, boolean>;
}

export interface HealthDiagnosticsResponse {
  status: LiveStatus;
  checks: HealthDiagnostic[];
}

export interface HealthMetricsResponse {
  counters: Record<string, number>;
  latencies: Record<string, { count: number; total: number; avg: number; max: number }>;
}

export interface HealthReadinessResponse {
  ready: boolean;
  status: LiveStatus;
  checks: HealthDiagnostic[];
}

export interface HealthLivenessResponse {
  alive: boolean;
  status: LiveStatus;
  stamp: number;
}

// ── Audit Center (M3 Phase 3, additive) ─────────────────────────────────────
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

export interface AuditTimelineResponse {
  total: number;
  events: AuditEvent[];
}

export interface AuditDiffEntry {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

export interface AuditPipelineGate {
  stage: string;
  ok: boolean;
  detail?: string;
  data?: unknown;
}

export interface AuditSnapshotRef {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  origin?: string;
  triggerType?: string;
}

export interface AuditRestoreOrigin {
  snapshotId: string;
  name: string;
  createdAt: string;
  actor?: string;
  reason?: string;
}

export interface AuditRevisionDetail {
  revision: number;
  correlationId: string;
  actor: string;
  scope: { type: string; workspaceId: number | null; branchId: number | null; executiveRole: string | null };
  timestamp: string;
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  diff: AuditDiffEntry[];
  gates: AuditPipelineGate[];
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

export interface CorrelationGraphResponse {
  correlationId: string;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}

// ── Drift Detection (M4 Phase 3, additive) ─────────────────────────────────
export type DriftSeverity = "NONE" | "WARNING" | "CRITICAL";

export interface DriftReport {
  cycleId: string;
  detectedAt: number;
  severity: DriftSeverity;
  baseline: { present: boolean; snapshotId: string | null; name: string | null; revisionNo: number | null };
  scope: Record<string, unknown>;
  baselineRevision: number;
  changes: DriftEntry[];
  affectedKeys: string[];
  recommendation: string;
}

export interface DriftEntry {
  key: string;
  expected: unknown;
  current: unknown;
  changed: boolean;
  criticality: "low" | "medium" | "high" | "critical";
}

// ── Maintenance Service (M4 Phase 4, additive) ──────────────────────────────
export type CycleStepStatus = "ok" | "error" | "skipped";

export interface MaintenanceCycle {
  cycleId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: "ok" | "degraded" | "error";
  steps: { name: string; status: CycleStepStatus; durationMs: number; detail?: string }[];
  retention: Record<string, unknown> | null;
  integrity: { checked: number; failures: unknown[]; ok: boolean } | null;
  gc: Record<string, unknown> | null;
  drift: DriftReport | null;
  health: { status: string; detail: string } | null;
}

export interface OperationalMetrics {
  totalCycles: number;
  successCount: number;
  failureCount: number;
  degradedPeriods: number;
  skippedJobs: number;
  avgDurationMs: number;
  lastCycleAt: number | null;
}

export interface MaintenanceStatusResponse {
  running: boolean;
  currentCycle: string | null;
  currentStep: string | null;
  startedAt: number | null;
  metrics: OperationalMetrics;
  lastSuccessfulCycle: MaintenanceCycle | null;
  lastFailedCycle: MaintenanceCycle | null;
  latestCycle: MaintenanceCycle | null;
}

export interface MaintenanceHistoryResponse {
  cycles: MaintenanceCycle[];
}

// ── Client ────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `settings API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const settingsApi = {
  list: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return request<CatalogResponse>(`${qs ? `?${qs}` : ""}`);
  },
  getField: (key: string) => request<FieldDetailResponse>(`/${encodeURIComponent(key)}`),
  resolved: () => request<Record<string, ConfigValue>>("/resolved"),
  trace: (key: string) => request<ResolvedValue[]>(`/trace?key=${encodeURIComponent(key)}`),
  preview: (body: PlanRequest) => request<PreviewResponse>("/preview", { method: "POST", body: JSON.stringify(body) }),
  simulate: (body: PlanRequest) => request<{ items: SimulateItem[] }>("/simulate", { method: "POST", body: JSON.stringify(body) }),
  impact: (body: PlanRequest) => request<ImpactResponse>("/impact", { method: "POST", body: JSON.stringify(body) }),
  policyCheck: (body: PlanRequest) => request<PolicyResponse>("/policy-check", { method: "POST", body: JSON.stringify(body) }),
  update: (key: string, body: { scope: ConfigScope; value: ConfigValue }) =>
    request<CommitResponse>(`/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body) }),
  snapshots: () => request<{ items: ConfigSnapshot[] }>("/snapshots"),
  restore: (snapshotId: string) =>
    request<{ ok: boolean; revision: number; correlationId: string; snapshotId: string }>("/restore", { method: "POST", body: JSON.stringify({ snapshotId }) }),
  packages: () => request<{ items: ConfigPackage[] }>("/packages"),
  installPackage: (packageId: string, opts?: { scope?: ConfigScope; dryRun?: boolean }) =>
    request<{ ok: boolean; revision?: number; applied: string[]; packageId: string }>("/packages/install", {
      method: "POST",
      body: JSON.stringify({ packageId, ...opts }),
    }),
  health: () => request<HealthResponse>("/health"),
  healthSummary: () => request<HealthSummaryResponse>("/health/summary"),
  healthDiagnostics: () => request<HealthDiagnosticsResponse>("/health/diagnostics"),
  healthMetrics: () => request<HealthMetricsResponse>("/health/metrics"),
  healthReadiness: () => request<HealthReadinessResponse>("/health/readiness"),
  healthLiveness: () => request<HealthLivenessResponse>("/health/liveness"),
  auditTimeline: (params?: { origin?: string; from?: string; to?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.origin) q.set("origin", params.origin);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<AuditTimelineResponse>(`/audit/timeline${qs ? `?${qs}` : ""}`);
  },
  auditSearch: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v != null && v !== "") q.set(k, String(v));
    const qs = q.toString();
    return request<AuditTimelineResponse>(`/audit/search${qs ? `?${qs}` : ""}`);
  },
  auditRevision: (revision: number) => request<AuditRevisionDetail>(`/audit/${revision}`),
  auditCorrelation: (correlationId: string) => request<CorrelationGraphResponse>(`/audit/correlation/${encodeURIComponent(correlationId)}`),
  drift: () => request<DriftReport>("/drift"),
  driftStatus: () => request<DriftReport | { cycleId: null; severity: "NONE" }>("/drift/status"),
  maintenance: () => request<MaintenanceStatusResponse>("/maintenance"),
  maintenanceHistory: () => request<MaintenanceHistoryResponse>("/maintenance/history"),
  maintenanceRun: () => request<MaintenanceCycle>("/maintenance/run", { method: "POST" }),
  testConnection: (key: string) =>
    request<{ ok: boolean; key: string; configured: boolean; secret: boolean; source: ConfigScope; message: string }>("/test-connection", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
};
