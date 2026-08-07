// ConfigCenter — REST API Zod schemas.
// Milestone 2 user layer. THIN: controllers validate wire I/O here only.
// No config business logic lives here — all logic stays in Registry/Resolver/
// Pipeline/SDK. Schemas encode Request, Response and Error shapes per endpoint.

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────────────────────────────────

export const scopeTypeSchema = z.enum(["default", "workspace", "branch", "executive"]);
export const executiveRoleSchema = z.enum(["CEO", "COO", "CFO", "CMO", "CHRO", "CAIO", "CKO", "CTO"]);

export const scopeSchema = z
  .object({
    type: scopeTypeSchema,
    workspaceId: z.number().int().positive().nullish(),
    branchId: z.number().int().positive().nullish(),
    executiveRole: executiveRoleSchema.nullish(),
  })
  .refine((s) => {
    if (s.type === "workspace") return s.workspaceId != null;
    if (s.type === "branch") return s.branchId != null;
    if (s.type === "executive") return s.executiveRole != null;
    return true;
  }, "scope coordinate is missing for the selected scope type");

export const resolutionContextSchema = z.object({
  workspaceId: z.number().int().positive().nullish(),
  branchId: z.number().int().positive().nullish(),
  executiveRole: executiveRoleSchema.nullish(),
});

export const configValueSchema: z.ZodType<unknown> = z.lazy(() => z.unknown());

const errorSchema = z.object({
  error: z.string(),
  correlationId: z.string().optional(),
  detail: z.unknown().optional(),
});

export const apiErrorSchema = errorSchema;

// ────────────────────────────────────────────────────────────────────────────
// Request bodies
// ────────────────────────────────────────────────────────────────────────────

// Shared payload for preview/simulate/impact/policy — all chain gates are
// evaluated by the pipeline.plan(). These endpoints NEVER commit.
export const planBodySchema = z.object({
  scope: scopeSchema,
  changes: z.record(z.string(), configValueSchema),
});

// PUT /api/v1/settings/:key — single-field commit at a scope.
export const commitBodySchema = z.object({
  scope: scopeSchema,
  value: configValueSchema,
});

// GET endpoints accept optional context as query params.
export const contextQuerySchema = z.object({
  workspaceId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  executiveRole: executiveRoleSchema.optional(),
});

export const listQuerySchema = contextQuerySchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
});

export const traceQuerySchema = contextQuerySchema.extend({
  key: z.string().min(1),
});

export const restoreBodySchema = z.object({
  snapshotId: z.string().min(1),
  actor: z.string().optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// Field metadata (Catalog) — derived from Registry, never hardcoded.
// ────────────────────────────────────────────────────────────────────────────

export const fieldMetaSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  type: z.enum(["string", "number", "boolean", "secret", "object"]),
  defaultValue: configValueSchema,
  allowedValues: z.array(z.union([z.string(), z.number()])).optional(),
  scope: z.array(scopeTypeSchema),
  owner: z.string().optional(),
  restartStrategy: z.enum(["hot", "reload", "restart", "manual"]).optional(),
  secret: z.boolean().optional(),
  immutable: z.boolean().optional(),
  featureFlag: z.boolean().optional(),
  experimental: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
  introducedVersion: z.string().optional(),
});

export const resolvedValueSchema = z.object({
  key: z.string(),
  value: configValueSchema,
  source: scopeSchema,
  inherited: z.boolean(),
});

export const traceStepSchema = z.object({
  key: z.string(),
  value: configValueSchema,
  source: scopeSchema,
  inherited: z.boolean(),
});

// GET /api/v1/settings — catalog grouped by category with effective values.
export const listResponseSchema = z.object({
  version: z.number(),
  checksum: z.string(),
  groups: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      description: z.string().optional(),
      fields: z.array(fieldMetaSchema),
    }),
  ),
});

// GET /api/v1/settings/:key — one field + resolved value + its trace.
export const getFieldResponseSchema = z.object({
  field: fieldMetaSchema,
  resolved: resolvedValueSchema,
  trace: z.array(traceStepSchema),
});

// PUT /api/v1/settings/:key — committed result.
export const commitResponseSchema = z.object({
  ok: z.literal(true),
  revision: z.number(),
  correlationId: z.string(),
  state: z.string(),
  scope: scopeSchema,
  changedKeys: z.array(z.string()),
});

// POST plan endpoints — a single PipelineRun slice per gate.
export const previewResponseSchema = z.object({
  ok: z.boolean(),
  before: z.record(z.string(), configValueSchema),
  after: z.record(z.string(), configValueSchema),
});

export const simulateResponseSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      estimate: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      reason: z.string(),
    }),
  ),
});

export const impactResponseSchema = z.object({
  impacted: z.array(z.string()),
});

export const policyResponseSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
  scope: scopeSchema,
  actor: z.string(),
});

// GET /api/v1/settings/resolved
export const resolvedResponseSchema = z.record(z.string(), configValueSchema);

// GET /api/v1/settings/trace
export const traceResponseSchema = z.array(traceStepSchema);

// ────────────────────────────────────────────────────────────────────────────
// Snapshots
// ────────────────────────────────────────────────────────────────────────────

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  actor: z.string(),
  revision: z.number(),
  scope: scopeSchema,
  changes: z.record(z.string(), configValueSchema),
});

export const snapshotsListResponseSchema = z.object({
  items: z.array(snapshotSchema),
});

export const restoreResponseSchema = z.object({
  ok: z.literal(true),
  revision: z.number(),
  correlationId: z.string(),
  snapshotId: z.string(),
});

// ── Milestone 3: persistent snapshot operations ────────────────────────────

export const snapshotOriginSchema = z.enum([
  "manual", "automatic", "pre-deploy", "scheduled", "rollback", "migration",
]);

export const snapshotStatusSchema = z.enum([
  "ACTIVE", "ARCHIVED", "PINNED", "RESTORED", "EXPIRED",
]);

export const snapshotFullSchema = z.object({
  id: z.string(),
  name: z.string(),
  environment: z.string(),
  scope: scopeSchema,
  revisionNo: z.number(),
  configVersion: z.number(),
  checksum: z.string(),
  registryChecksum: z.string(),
  fingerprint: z.object({
    checksum: z.string(),
    registryChecksum: z.string(),
    configVersion: z.number(),
    revisionNo: z.number(),
  }),
  origin: snapshotOriginSchema,
  triggerType: z.string(),
  status: snapshotStatusSchema,
  pinned: z.boolean(),
  createdAt: z.string(),
  metadata: z.object({
    actor: z.string(),
    correlationId: z.string().optional(),
    pipelineStage: z.string().optional(),
    reason: z.string().optional(),
    sourceRevision: z.number().optional(),
  }),
  payload: z.record(z.string(), configValueSchema),
  changes: z.record(z.string(), configValueSchema),
});

export const captureBodySchema = z.object({
  name: z.string().min(1),
  scope: scopeSchema,
  origin: snapshotOriginSchema.optional(),
  environment: z.string().optional(),
  reason: z.string().optional(),
  correlationId: z.string().optional(),
  pipelineStage: z.string().optional(),
});

export const verificationResponseSchema = z.object({
  ok: z.boolean(),
  reasons: z.array(z.string()),
  snapshotId: z.string().optional(),
});

export const retentionPolicySchema = z.object({
  keepLatest: z.number().int().min(0),
  keepYoungerThanDays: z.number().int().min(0),
});

export const retentionResponseSchema = z.object({
  policy: retentionPolicySchema,
  candidates: z.array(snapshotFullSchema),
});

export const gcResponseSchema = z.object({
  type: z.literal("snapshot.gc"),
  collected: z.number(),
  snapshotIds: z.array(z.string()),
  policy: retentionPolicySchema,
  skippedPinned: z.number(),
  skippedReferenced: z.number(),
  correlationId: z.string(),
  createdAt: z.string(),
});

// ────────────────────────────────────────────────────────────────────────────
// Packages
// ────────────────────────────────────────────────────────────────────────────

export const packageSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  changes: z.record(z.string(), configValueSchema),
  scope: scopeSchema.optional(),
});

export const packagesListResponseSchema = z.object({
  items: z.array(packageSchema),
});

export const installBodySchema = z.object({
  packageId: z.string().min(1),
  scope: scopeSchema.optional(),
  dryRun: z.boolean().optional(),
});

export const installResponseSchema = z.object({
  ok: z.boolean(),
  revision: z.number().optional(),
  correlationId: z.string().optional(),
  applied: z.array(z.string()),
  packageId: z.string(),
});

// ────────────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────────────

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  registry: z.object({
    status: z.enum(["ok", "degraded", "error"]),
    frozen: z.boolean(),
    fieldCount: z.number(),
    groupCount: z.number(),
    checksum: z.string(),
  }),
  store: z.object({
    status: z.enum(["ok", "degraded", "error"]),
    revision: z.number(),
    overrideCount: z.number(),
  }),
  resolver: z.object({
    status: z.enum(["ok", "degraded", "error"]),
    cacheSize: z.number(),
    lastRevision: z.number(),
  }),
  eventBus: z.object({
    status: z.enum(["ok", "degraded", "error"]),
    lastRevision: z.number(),
    subscriberCount: z.number(),
  }),
  capabilities: z.record(z.string(), z.boolean()),
});

// ── Live Health (Milestone 3, Phase 2, additive) ───────────────────────────
// New read-only sub-endpoints composed from the same center internals. They do
// NOT change the locked /health contract above — they add richer observability.
export const liveStatusSchema = z.enum(["ok", "degraded", "error"]);

export const defaultedStatus = liveStatusSchema.optional().default("ok");

export const healthDiagnosticSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: liveStatusSchema,
  detail: z.string(),
});

export const healthSummaryResponseSchema = z.lazy(() =>
  z.object({
    status: liveStatusSchema,
    updatedAt: z.string(),
    registry: z.object({
      status: liveStatusSchema,
      frozen: z.boolean(),
      fieldCount: z.number(),
      groupCount: z.number(),
      checksum: z.string(),
    }),
    store: z.object({
      status: liveStatusSchema,
      revision: z.number(),
      overrideCount: z.number(),
    }),
    resolver: z.object({
      status: liveStatusSchema,
      cacheSize: z.number(),
      lastRevision: z.number(),
    }),
    eventBus: z.object({
      status: liveStatusSchema,
      deliveredRevision: z.number(),
      storeRevision: z.number(),
      subscriberCount: z.number(),
      publishedEvents: z.number(),
    }),
    snapshots: z.object({
      count: z.number(),
      retentionCandidates: z.number(),
      policy: retentionPolicySchema,
      lastRestore: snapshotFullSchema.nullable(),
    }),
    capabilities: z.record(z.string(), z.boolean()),
  }),
);

export const healthDiagnosticsResponseSchema = z.lazy(() =>
  z.object({
    status: liveStatusSchema,
    checks: z.array(healthDiagnosticSchema),
  }),
);

export const healthMetricsResponseSchema = z.object({
  counters: z.record(z.string(), z.number()),
  latencies: z.record(
    z.string(),
    z.object({ count: z.number(), total: z.number(), avg: z.number(), max: z.number() }),
  ),
});

export const healthReadinessResponseSchema = z.lazy(() =>
  z.object({
    ready: z.boolean(),
    status: liveStatusSchema,
    checks: z.array(healthDiagnosticSchema),
  }),
);

export const healthLivenessResponseSchema = z.object({
  alive: z.boolean(),
  status: liveStatusSchema,
  stamp: z.number(),
});

// POST /test-connection — resolves a provider key in a context (no business logic;
// just surfaces whether the value is reachable + which capability it feeds).
export const testConnectionBodySchema = z.object({
  key: z.string().min(1),
  context: contextQuerySchema.optional(),
});

export const testConnectionResponseSchema = z.object({
  ok: z.boolean(),
  key: z.string(),
  configured: z.boolean(),
  secret: z.boolean(),
  source: scopeSchema,
  message: z.string(),
});

// ── Audit Center (M3 Phase 3, additive) ─────────────────────────────────────
export const auditOriginSchema = z.enum(["revision", "snapshot", "gc"]);

export const auditEventSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    origin: auditOriginSchema,
    timestamp: z.string(),
    revision: z.number().optional(),
    correlationId: z.string().optional(),
    actor: z.string().optional(),
    scope: z.record(z.string(), z.unknown()).optional(),
    changedKeys: z.array(z.string()),
    triggerType: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
);

export const auditTimelineResponseSchema = z.lazy(() =>
  z.object({ total: z.number(), events: z.array(auditEventSchema) }),
);

export const auditTimelineQuerySchema = z.object({
  origin: auditOriginSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().nonnegative().optional(),
});

export const auditSearchQuerySchema = z.object({
  actor: z.string().optional(),
  scopeType: z.string().optional(),
  revision: z.coerce.number().optional(),
  correlationId: z.string().optional(),
  snapshotId: z.string().optional(),
  triggerType: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  configVersion: z.coerce.number().optional(),
});

export const auditScopeSchema = z.object({
  type: scopeTypeSchema,
  workspaceId: z.number().nullable(),
  branchId: z.number().nullable(),
  executiveRole: executiveRoleSchema.nullable(),
});

export const auditDiffEntrySchema = z.object({
  key: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  changed: z.boolean(),
});

export const auditPipelineGateSchema = z.object({
  stage: z.string(),
  ok: z.boolean(),
  detail: z.string().optional(),
  data: z.unknown().optional(),
});

export const auditSnapshotRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  origin: z.string().optional(),
  triggerType: z.string().optional(),
});

export const auditRestoreOriginSchema = z.object({
  snapshotId: z.string(),
  name: z.string(),
  createdAt: z.string(),
  actor: z.string().optional(),
  reason: z.string().optional(),
});

export const auditRevisionDetailSchema = z.lazy(() =>
  z.object({
    revision: z.number(),
    correlationId: z.string(),
    actor: z.string(),
    scope: auditScopeSchema,
    timestamp: z.string(),
    changedKeys: z.array(z.string()),
    before: z.record(z.string(), z.unknown()),
    after: z.record(z.string(), z.unknown()),
    diff: z.array(auditDiffEntrySchema),
    gates: z.array(auditPipelineGateSchema),
    snapshots: z.array(auditSnapshotRefSchema),
    restoreOrigin: auditRestoreOriginSchema.nullable(),
    configVersion: z.number(),
    health: z.record(z.string(), z.unknown()),
  }),
);

export const correlationNodeSchema = z.object({
  kind: z.enum(["change", "revision", "snapshot", "audit", "event", "health", "restore", "gc"]),
  label: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export const correlationEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.string(),
});

export const correlationGraphResponseSchema = z.object({
  correlationId: z.string(),
  nodes: z.array(correlationNodeSchema),
  edges: z.array(correlationEdgeSchema),
});

export const auditExportResponseSchema = z.object({
  format: z.literal("csv"),
  filename: z.string(),
  content: z.string(),
});

// ── Drift Detection (M4 Phase 3, additive) ──────────────────────────────────
export const driftSeveritySchema = z.enum(["NONE", "WARNING", "CRITICAL"]);

export const driftEntrySchema = z.object({
  key: z.string(),
  expected: configValueSchema,
  current: configValueSchema,
  changed: z.boolean(),
  criticality: z.enum(["low", "medium", "high", "critical"]),
});

export const driftReportResponseSchema = z.object({
  cycleId: z.string(),
  detectedAt: z.number(),
  severity: driftSeveritySchema,
  baseline: z.object({
    present: z.boolean(),
    snapshotId: z.string().nullable(),
    name: z.string().nullable(),
    revisionNo: z.number().nullable(),
  }),
  scope: scopeSchema,
  baselineRevision: z.number(),
  changes: z.array(driftEntrySchema),
  affectedKeys: z.array(z.string()),
  recommendation: z.string(),
});

export const driftStatusResponseSchema = driftReportResponseSchema.extend({
  cycleId: z.string().nullable(),
  baseline: z.object({
    present: z.boolean(),
    snapshotId: z.string().nullable(),
    name: z.string().nullable(),
    revisionNo: z.number().nullable(),
  }),
  changes: z.array(driftEntrySchema),
});

// ── Maintenance Service (M4 Phase 4, additive) ──────────────────────────────
export const cycleStepSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "error", "skipped"]),
  durationMs: z.number(),
  detail: z.string().optional(),
});

export const maintenanceCycleSchema = z.lazy(() =>
  z.object({
    cycleId: z.string(),
    startedAt: z.number(),
    finishedAt: z.number(),
    durationMs: z.number(),
    status: z.enum(["ok", "degraded", "error"]),
    steps: z.array(cycleStepSchema),
    retention: z.record(z.string(), z.unknown()).nullable(),
    integrity: z.record(z.string(), z.unknown()).nullable(),
    gc: z.record(z.string(), z.unknown()).nullable(),
    drift: driftReportResponseSchema.nullable(),
    health: z.object({ status: z.string(), detail: z.string() }).nullable(),
  }),
);

export const maintenanceMetricsSchema = z.object({
  totalCycles: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  degradedPeriods: z.number(),
  skippedJobs: z.number(),
  avgDurationMs: z.number(),
  lastCycleAt: z.number().nullable(),
});

export const maintenanceStatusResponseSchema = z.object({
  running: z.boolean(),
  currentCycle: z.string().nullable(),
  currentStep: z.string().nullable(),
  startedAt: z.number().nullable(),
  metrics: maintenanceMetricsSchema,
  lastSuccessfulCycle: maintenanceCycleSchema.nullable(),
  lastFailedCycle: maintenanceCycleSchema.nullable(),
  latestCycle: maintenanceCycleSchema.nullable(),
});

export const maintenanceHistoryResponseSchema = z.object({
  cycles: z.array(maintenanceCycleSchema),
});

// ────────────────────────────────────────────────────────────────────────────
// Governance & Approval (M5 Phase 1 + Phase 2, additive)
// ────────────────────────────────────────────────────────────────────────────
export const approvalRequestStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled", "expired"]);

export const approverVoteSchema = z.object({
  actorId: z.string(),
  role: z.string(),
  at: z.number(),
  note: z.string().optional(),
});

export const approvalHistoryStepSchema = z.object({
  seq: z.number(),
  type: z.string(),
  at: z.number(),
  actorId: z.string().optional(),
  role: z.string().optional(),
  note: z.string().optional(),
  revision: z.number().optional(),
  correlationId: z.string().optional(),
});

export const approvalRequestSchema = z.object({
  id: z.string(),
  status: approvalRequestStatusSchema,
  requester: z.object({
    actorId: z.string().nullable(),
    role: z.string(),
    branchId: z.number().nullable(),
    workspaceId: z.number().nullable(),
  }),
  scope: scopeSchema,
  changes: z.record(z.string(), configValueSchema),
  requiredApprovals: z.number(),
  matchedPolicies: z.array(z.string()),
  approvals: z.array(approverVoteSchema),
  rejections: z.array(approverVoteSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  resolvedAt: z.number().optional(),
  expiresAt: z.number().optional(),
  version: z.number(),
  correlationId: z.string().optional(),
  revision: z.number().optional(),
  reason: z.string().optional(),
  history: z.array(approvalHistoryStepSchema),
});

export const proposalBodySchema = z.object({
  scope: scopeSchema,
  changes: z.record(z.string(), configValueSchema),
  reason: z.string().optional(),
});

// POST /governance/propose — DIRECT commits produce a revision; approval-gated
// proposals return a PENDING request (202). blocked/invalid are HTTP statuses.
export const proposalResponseSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("direct"),
    revision: z.number(),
    correlationId: z.string(),
    state: z.string(),
    scope: scopeSchema,
    changedKeys: z.array(z.string()),
  }),
  z.object({ mode: z.literal("approval"), request: approvalRequestSchema }),
]);

export const approvalListQuerySchema = z.object({
  status: approvalRequestStatusSchema.optional(),
  requesterId: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["createdAt", "updatedAt", "requiredApprovals"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().nonnegative().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const approvalListResponseSchema = z.object({
  total: z.number(),
  items: z.array(approvalRequestSchema),
  limit: z.number(),
  offset: z.number(),
});

export const voteBodySchema = z.object({
  note: z.string().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const approvalDetailResponseSchema = z.object({
  request: approvalRequestSchema,
  timeline: z.array(
    z.object({
      seq: z.number(),
      requestId: z.string(),
      version: z.number(),
      type: z.string(),
      at: z.number(),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
});

export const approvalExpireResponseSchema = z.object({
  expired: z.array(approvalRequestSchema),
});

export const attentionItemSchema = z.object({
  request: approvalRequestSchema,
  elapsedMs: z.number(),
  remainingMs: z.number().nullable(),
});

export const attentionQuerySchema = z.object({
  sinceMs: z.coerce.number().optional(),
  warnMs: z.coerce.number().optional(),
});

export const approvalAttentionResponseSchema = z.object({
  items: z.array(attentionItemSchema),
});

export const approvalApproveResponseSchema = z.object({
  request: approvalRequestSchema,
  committed: z.object({ revision: z.number(), correlationId: z.string() }).optional(),
});

export const policyMatrixResponseSchema = z.object({
  matrix: z.array(z.object({ tier: z.string(), approvals: z.number(), description: z.string() })),
  note: z.string(),
});

export const governanceCountsSchema = z.object({
  pending: z.number(),
  approved: z.number(),
  rejected: z.number(),
  cancelled: z.number(),
  expired: z.number(),
});

// ── Operational governance: Change Freeze / Window / Calendar / Break-glass (M5 Phase 3) ──
export const freezeScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("workspace"), workspaceId: z.number().int().positive() }),
  z.object({ type: z.literal("branch"), branchId: z.number().int().positive() }),
  z.object({ type: z.literal("executive"), executiveRole: executiveRoleSchema }),
]);

export const freezeDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  reason: z.string(),
  scope: freezeScopeSchema,
  keys: z.array(z.string()).optional(),
  from: z.number(),
  until: z.number().optional(),
  createdBy: z.object({
    actorId: z.string().nullable(),
    role: z.string(),
    branchId: z.number().nullable(),
    workspaceId: z.number().nullable(),
  }),
  createdAt: z.number(),
  revokedAt: z.number().optional(),
});

export const freezeCreateBodySchema = z.object({
  label: z.string().min(1),
  reason: z.string().min(1),
  scope: freezeScopeSchema,
  keys: z.array(z.string()).optional(),
  from: z.number().optional(),
  until: z.number().optional(),
});

export const freezeListResponseSchema = z.object({ items: z.array(freezeDefinitionSchema) });

export const windowKindSchema = z.enum(["recurring", "one-off"]);

export const windowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: windowKindSchema,
  days: z.array(z.number()).optional(),
  startMinute: z.number().optional(),
  endMinute: z.number().optional(),
  from: z.number().optional(),
  to: z.number().optional(),
  createdAt: z.number(),
  createdBy: z.string(),
});

export const windowCreateBodySchema = z
  .object({
    name: z.string().min(1),
    kind: windowKindSchema,
    days: z.array(z.number().int().min(0).max(6)).optional(),
    startMinute: z.number().int().min(0).max(1439).optional(),
    endMinute: z.number().int().min(0).max(1440).optional(),
    from: z.number().optional(),
    to: z.number().optional(),
  });

export const windowListResponseSchema = z.object({ items: z.array(windowDefinitionSchema) });

export const windowRemoveResponseSchema = z.object({ ok: z.literal(true), removed: z.literal(true), id: z.string() });

export const governanceCalendarSchema = z.object({
  at: z.number(),
  freezes: z.object({
    all: z.array(freezeDefinitionSchema),
    active: z.array(freezeDefinitionSchema),
    activeCount: z.number(),
  }),
  window: z.object({
    windows: z.array(windowDefinitionSchema),
    active: windowDefinitionSchema.nullable(),
    nextStartAt: z.number().nullable(),
    withinWindow: z.boolean(),
  }),
});

export const breakGlassBodySchema = z.object({
  scope: scopeSchema,
  changes: z.record(z.string(), configValueSchema),
  reason: z.string().min(1),
});

export const breakGlassResponseSchema = z.object({
  revision: z.number(),
  correlationId: z.string(),
  ranGate: z.object({
    ok: z.boolean(),
    blocked: z.boolean(),
    reasons: z.array(z.string()),
    windowBy: z.array(z.string()),
    windowRequired: z.boolean(),
    withinWindow: z.boolean(),
    activeWindow: z.object({ id: z.string(), name: z.string() }).nullable(),
  }),
  record: z.object({
    seq: z.number(),
    type: z.string(),
    at: z.number(),
    actor: z.string(),
    scope: z.record(z.string(), z.unknown()).optional(),
    data: z.record(z.string(), z.unknown()),
  }),
});

export const pendingCommitResponseSchema = z.object({
  status: z.literal("pending"),
  request: approvalRequestSchema,
});