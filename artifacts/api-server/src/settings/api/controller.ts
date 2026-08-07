// ConfigCenter — REST Controller (Milestone 2 user layer).
// THIN: validates wire I/O via zod, delegates to ConfigCenter, maps results to
// responses. Contains NO config business logic — inheritance stays in the
// Resolver, governance in the Pipeline, catalog in the Registry, reads in SDK.

import type { ConfigurationRegistry } from "../registry";
import type { ConfigurationResolver } from "../resolver";
import type { ConfigurationPipeline } from "../pipeline";
import type { ConfigSecurity, WriteActor, ConfigRole } from "../security";
import type { ConfigCenterHealth } from "../health";
import { REGISTRY_CONFIG_VERSION } from "../defaults";
import type { ConfigCenter } from "../index";
import type { SnapshotManager } from "./snapshots";
import type { PackageStore } from "./packages";
import type { ConfigScope, ResolutionContext } from "../types";
import { scrubForTransport } from "./scrub";
import { ConfigCenterLiveHealth } from "./health/source";
import { ConfigAuditCenter, type AuditFilters, type AuditSearchQuery } from "./audit/source";
import { DriftDetector } from "../automation/drift";
import { SnapshotMaintenanceService } from "../automation/snapshot-maintenance";
import { BackgroundMaintenanceService } from "../automation/maintenance-service";
import { ConfigGovernance, type ApprovalStatus, type ProposeOutcome } from "../governance";

export interface SettingsControllerDeps {
  center: ConfigCenter;
  snapshots: SnapshotManager;
  packages: PackageStore;
}

export interface ActorUser {
  id: number;
  role: string;
  branchId?: number | null;
  workspaceId?: number | null;
}

// Map an authenticated app user role to a ConfigRole. Transparent mapping only —
// authorization itself is enforced inside the Pipeline (security.canWrite).
const ROLE_MAP: Record<string, ConfigRole | undefined> = {
  owner: "owner",
  manager: "manager",
  admin: "admin",
  developer: "developer",
  viewer: "viewer",
  cashier: "viewer",
};

export class SettingsController {
  private readonly registry: ConfigurationRegistry;
  private readonly resolver: ConfigurationResolver;
  private readonly pipeline: ConfigurationPipeline;
  private readonly security: ConfigSecurity;
  private readonly healthReporter: ConfigCenterHealth;
private readonly center: ConfigCenter;
  private readonly snapshots: SnapshotManager;
  private readonly packages: PackageStore;
  private readonly liveHealth: ConfigCenterLiveHealth;
  private readonly audit: ConfigAuditCenter;
  private readonly driftDetector: DriftDetector;
  private readonly maintenanceService: BackgroundMaintenanceService;
  private readonly governance: ConfigGovernance;

  constructor(deps: SettingsControllerDeps) {
    this.center = deps.center;
    this.registry = deps.center.registry;
    this.resolver = deps.center.resolver;
    this.pipeline = deps.center.pipeline;
    this.security = deps.center.security;
    this.healthReporter = deps.center.health;
    this.snapshots = deps.snapshots;
    this.packages = deps.packages;
    this.liveHealth = new ConfigCenterLiveHealth({ center: deps.center, snapshots: deps.snapshots });
    this.audit = new ConfigAuditCenter({ center: deps.center, snapshots: deps.snapshots });
    this.driftDetector = new DriftDetector({
      snapshots: deps.snapshots,
      resolver: deps.center.sdk,
      registry: deps.center.registry,
    });
    this.maintenanceService = new BackgroundMaintenanceService({
      maintenance: new SnapshotMaintenanceService({ snapshots: deps.snapshots }),
      drift: this.driftDetector,
      health: {
        report: async () => {
          const report = await deps.center.health.report();
          return { status: report.status };
        },
      },
    });
    this.governance = new ConfigGovernance({
      registry: deps.center.registry,
      pipeline: deps.center.pipeline,
    });
  }

  // Derive a WriteActor from the authenticated request user.
  actor(user: ActorUser): WriteActor {
    return {
      actorId: String(user.id),
      role: ROLE_MAP[user.role] ?? "viewer",
      branchId: user.branchId ?? null,
      workspaceId: user.workspaceId ?? null,
    };
  }

  // GET /api/v1/settings — catalog grouped, with current revision + checksum.
  async list(ctx: { category?: string; search?: string }): Promise<unknown> {
    let groups = this.registry.listGroups();
    if (ctx.category) groups = groups.filter((g) => g.category === ctx.category || g.id === ctx.category);
    if (ctx.search) {
      const q = ctx.search.toLowerCase();
      groups = groups.map((g) => ({
        ...g,
        fields: g.fields.filter((f) => f.key.toLowerCase().includes(q) || f.title.toLowerCase().includes(q)),
      })).filter((g) => g.fields.length > 0);
    }
    return {
      version: REGISTRY_CONFIG_VERSION,
      checksum: this.registry.isFrozen ? this.registry.getChecksum() : "",
      groups,
    };
  }

  // GET /api/v1/settings/:key — one field + resolved + trace.
  async getField(key: string, ctx: ResolutionContext): Promise<unknown> {
    const field = this.registry.require(key);
    const resolvedValue = await this.resolver.resolve(key, ctx);
    const trace = await this.resolver.trace(key, ctx);
    return { field, resolved: resolvedValue, trace };
  }

  // PUT /api/v1/settings/:key — commit via pipeline (M5: routed through
  // Governance — DIRECT when no policy tier requires approval, otherwise the
  // change is held as a PENDING ApprovalRequest and no revision is produced).
  async update(key: string, params: { scope: unknown; value?: unknown }, actorUser: ActorUser): Promise<unknown> {
    const proposal = await this.governance.propose({
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope,
      changes: { [key]: params.value },
    });
    if (proposal.mode === "invalid") throw new ConfigHttpError(422, "validation failed", proposal.errors);
    if (proposal.mode === "blocked") throw new ConfigHttpError(403, proposal.reason);
    if (proposal.mode === "approval") return { status: "pending", request: proposal.request };
    const run = proposal.run;
    return {
      ok: true,
      revision: run.revision,
      correlationId: run.correlationId,
      state: run.state,
      scope: run.scope,
      changedKeys: [key],
    };
  }

  // POST /preview — pipeline plan, never commits.
  async preview(params: { scope: unknown; changes: unknown }, actorUser: ActorUser): Promise<unknown> {
    const run = await this.pipeline.plan({
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope,
      changes: params.changes as Record<string, unknown>,
    });
    const validation = run.validation;
    if (!validation?.ok) throw new ConfigHttpError(422, "validation failed", validation?.errors);
    return run.preview;
  }

  // POST /simulate — pipeline plan simulation slice.
  async simulate(params: { scope: unknown; changes: unknown }, actorUser: ActorUser): Promise<unknown> {
    const run = await this.pipeline.plan({
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope,
      changes: params.changes as Record<string, unknown>,
    });
    const validation = run.validation;
    if (!validation?.ok) throw new ConfigHttpError(422, "validation failed", validation?.errors);
    return { items: run.simulation ?? [] };
  }

  // POST /impact — affected subsystems from Registry dependency edges.
  async impact(params: { scope: unknown; changes: unknown }, actorUser: ActorUser): Promise<unknown> {
    const run = await this.pipeline.plan({
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope,
      changes: params.changes as Record<string, unknown>,
    });
    const validation = run.validation;
    if (!validation?.ok) throw new ConfigHttpError(422, "validation failed", validation?.errors);
    return { impacted: run.impact ?? [] };
  }

  // POST /policy-check — RBAC gate result.
  async checkPolicy(params: { scope: unknown; changes: unknown }, actorUser: ActorUser): Promise<unknown> {
    const actor = this.actor(actorUser);
    const run = await this.pipeline.plan({
      actor,
      scope: params.scope as ConfigScope,
      changes: params.changes as Record<string, unknown>,
    });
    return { ok: run.policy?.ok ?? false, reason: run.policy?.reason, scope: run.scope, actor: run.actor };
  }

  // GET /settings/resolved
  async resolved(ctx: ResolutionContext): Promise<unknown> {
    const effective = await this.resolver.effective(ctx);
    return scrubForTransport(effective, this.registry);
  }

  // GET /settings/trace
  async trace(key: string, ctx: ResolutionContext): Promise<unknown> {
    return this.resolver.trace(key, ctx);
  }

  // ── Snapshots ──────────────────────────────────────────────────────────
  async createSnapshot(params: { name: string; scope: unknown }, actorUser: ActorUser): Promise<unknown> {
    return this.snapshots.capture({
      name: params.name,
      scope: params.scope as ConfigScope,
      actor: actorUser.role,
    });
  }

  // M3 — capture with origin/environment/reason metadata.
  async captureSnapshot(params: {
    name: string;
    scope: unknown;
    origin?: string;
    environment?: string;
    reason?: string;
    correlationId?: string;
    pipelineStage?: string;
  }, actorUser: ActorUser): Promise<unknown> {
    return this.snapshots.capture({
      name: params.name,
      scope: params.scope as ConfigScope,
      actor: actorUser.role,
      origin: params.origin as never,
      environment: params.environment,
      reason: params.reason,
      correlationId: params.correlationId,
      pipelineStage: params.pipelineStage,
    });
  }

  async getSnapshot(id: string): Promise<unknown> {
    const snap = await this.snapshots.get(id);
    if (!snap) throw new ConfigHttpError(404, "snapshot not found");
    return snap;
  }

  async listSnapshots(query: string): Promise<unknown> {
    return { items: this.snapshots.search(query) };
  }

  async restoreSnapshot(params: { snapshotId: string }, actorUser: ActorUser): Promise<unknown> {
    const { revision, correlationId } = await this.snapshots.restore({ id: params.snapshotId, actor: this.actor(actorUser) });
    return { ok: true, revision, correlationId, snapshotId: params.snapshotId };
  }

  async verifySnapshot(id: string): Promise<unknown> {
    const result = await this.snapshots.verify(id);
    return { ...result, snapshotId: id };
  }

  async pinSnapshot(id: string): Promise<unknown> {
    await this.snapshots.pin(id);
    return { ok: true, snapshotId: id, pinned: true };
  }

  async unpinSnapshot(id: string): Promise<unknown> {
    await this.snapshots.unpin(id);
    return { ok: true, snapshotId: id, pinned: false };
  }

  async snapshotRetention(policy: unknown): Promise<unknown> {
    const applied = this.snapshots.setRetentionPolicy(policy as { keepLatest?: number; keepYoungerThanDays?: number });
    const candidates = this.snapshots.retentionCandidates();
    return { policy: applied, candidates };
  }

  async snapshotGc(): Promise<unknown> {
    return this.snapshots.runGc();
  }

  async compareSnapshots(aId: string, bId: string): Promise<unknown> {
    return { diff: this.snapshots.compare(aId, bId) };
  }

  // ── Packages ───────────────────────────────────────────────────────────
  async listPackages(): Promise<unknown> {
    return { items: this.packages.list() };
  }

  async installPackage(params: { packageId: string; scope?: unknown; dryRun?: boolean }, actorUser: ActorUser): Promise<unknown> {
    return this.packages.install({
      packageId: params.packageId,
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope | undefined,
      dryRun: params.dryRun,
    });
  }

  // ── Health ─────────────────────────────────────────────────────────────
  async health(): Promise<unknown> {
    return this.healthReporter.report();
  }

  // ── Live Health (M3 Phase 2, additive read-only observability) ─────────
  async healthSummary(): Promise<unknown> {
    return this.liveHealth.summary();
  }

  healthDiagnostics(): unknown {
    return this.liveHealth.diagnostics();
  }

  healthMetrics(): unknown {
    return this.liveHealth.metrics();
  }

  healthReadiness(): unknown {
    return this.liveHealth.readiness();
  }

  healthLiveness(): unknown {
    return this.liveHealth.liveness();
  }

  // ── Audit Center (M3 Phase 3, additive read-only) ──────────────────────
  auditTimeline(query: { origin?: string; from?: string; to?: string; limit?: number }): unknown {
    return this.audit.timeline(query as AuditFilters);
  }

  auditSearch(query: Record<string, unknown>): unknown {
    const q: AuditSearchQuery = {
      actor: typeof query["actor"] === "string" ? query["actor"] : undefined,
      scopeType: typeof query["scopeType"] === "string" ? query["scopeType"] : undefined,
      revision: query["revision"] != null ? Number(query["revision"]) : undefined,
      correlationId: typeof query["correlationId"] === "string" ? query["correlationId"] : undefined,
      triggerType: typeof query["triggerType"] === "string" ? query["triggerType"] : undefined,
      status: typeof query["status"] === "string" ? query["status"] : undefined,
      from: typeof query["from"] === "string" ? query["from"] : undefined,
      to: typeof query["to"] === "string" ? query["to"] : undefined,
      configVersion: query["configVersion"] != null ? Number(query["configVersion"]) : undefined,
    };
    return this.audit.search(q);
  }

  async auditRevision(revision: number): Promise<unknown> {
    const detail = await this.audit.revision(revision);
    if (!detail) throw new ConfigHttpError(404, `revision ${revision} not found`);
    return detail;
  }

  async auditCorrelation(correlationId: string): Promise<unknown> {
    const graph = await this.audit.correlation(correlationId);
    if (!graph) throw new ConfigHttpError(404, `correlation ${correlationId} not found`);
    return graph;
  }

  auditExport(): unknown {
    return {
      format: "csv",
      filename: `settings-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      content: this.audit.exportCsv(),
    };
  }

  // ── Drift Detection (M4 Phase 3, additive read-only) ─────────────────────
  async drift(): Promise<unknown> {
    return this.driftDetector.detect();
  }

  driftStatus(): unknown {
    const report = this.driftDetector.status();
    return report ?? { cycleId: null, severity: "NONE", baseline: { present: false }, changes: [], affectedKeys: [], recommendation: "No drift detection run yet." };
  }

  // ── Maintenance Service (M4 Phase 4, additive read-only) ──────────────────
  maintenanceStatus(): unknown {
    return this.maintenanceService.status();
  }

  maintenanceHistory(): unknown {
    return { cycles: this.maintenanceService.cycleHistory() };
  }

  async maintenanceRun(): Promise<unknown> {
    if (this.maintenanceService.isRunning()) {
      throw new ConfigHttpError(409, "maintenance cycle already running");
    }
    return this.maintenanceService.runCycle();
  }

  // ── Governance & Approval (M5 Phase 1, additive) ──────────────────────────
  async proposeChange(params: { scope: unknown; changes: unknown; reason?: string }, actorUser: ActorUser): Promise<ProposeOutcome> {
    return this.governance.propose({
      actor: this.actor(actorUser),
      scope: params.scope as ConfigScope,
      changes: params.changes as Record<string, unknown>,
      reason: params.reason,
    });
  }

  approvalList(query: { status?: string; requesterId?: string; search?: string; sort?: string; order?: string; limit?: number; offset?: number }): unknown {
    const status = (["pending", "approved", "rejected", "cancelled", "expired"] as const).includes(query.status as never)
      ? (query.status as ApprovalStatus)
      : undefined;
    const sort = (["createdAt", "updatedAt", "requiredApprovals"] as const).includes(query.sort as never)
      ? (query.sort as "createdAt" | "updatedAt" | "requiredApprovals")
      : undefined;
    const order = query.order === "asc" ? "asc" : query.order === "desc" ? "desc" : undefined;
    return this.governance.listRequests({
      status,
      requesterId: query.requesterId,
      search: query.search,
      sort,
      order,
      limit: query.limit,
      offset: query.offset,
    });
  }

  approvalGet(id: string): unknown {
    const request = this.governance.getRequest(id);
    if (!request) throw new ConfigHttpError(404, `approval request not found: ${id}`);
    return request;
  }

  approvalDetail(id: string): unknown {
    const detail = this.governance.detail(id);
    if (!detail) throw new ConfigHttpError(404, `approval request not found: ${id}`);
    return detail;
  }

  async approvalApprove(id: string, actorUser: ActorUser, note?: string, expectedVersion?: number): Promise<unknown> {
    return this.governance.approve(id, this.actor(actorUser), note, expectedVersion);
  }

  approvalReject(id: string, actorUser: ActorUser, note?: string, expectedVersion?: number): unknown {
    return this.governance.reject(id, this.actor(actorUser), note, expectedVersion);
  }

  approvalCancel(id: string, actorUser: ActorUser, expectedVersion?: number): unknown {
    return this.governance.cancel(id, this.actor(actorUser), expectedVersion);
  }

  approvalExpire(): unknown {
    return { expired: this.governance.expirePending() };
  }

  approvalAttention(query: { sinceMs?: number; warnMs?: number }): unknown {
    return { items: this.governance.dueAttention(query) };
  }

  governancePolicies(): unknown {
    return this.governance.policies();
  }

  governanceCounts(): unknown {
    return this.governance.counts();
  }

  // ── Change Freeze / Window / Calendar / Break-glass (M5 Phase 3, additive) ─
  freezeCreate(body: { label: string; reason: string; scope: unknown; keys?: string[]; from?: number; until?: number }, actorUser: ActorUser): unknown {
    return this.governance.createFreeze({
      ...body,
      scope: body.scope as never,
      actor: this.actor(actorUser),
    });
  }

  freezeList(): unknown {
    return this.governance.listFreezes();
  }

  freezeRevoke(id: string, actorUser: ActorUser): unknown {
    const freeze = this.governance.revokeFreeze(id, this.actor(actorUser));
    if (!freeze) throw new ConfigHttpError(404, `freeze not found: ${id}`);
    return freeze;
  }

  windowCreate(body: { name: string; kind: "recurring" | "one-off"; days?: number[]; startMinute?: number; endMinute?: number; from?: number; to?: number }, actorUser: ActorUser): unknown {
    return this.governance.createWindow({ ...body, actor: actorUser.role });
  }

  windowList(): unknown {
    return this.governance.listWindows();
  }

  windowRemove(id: string, actorUser: ActorUser): unknown {
    const removed = this.governance.removeWindow(id, actorUser.role);
    if (!removed) throw new ConfigHttpError(404, `window not found: ${id}`);
    return { ok: true, removed: true, id };
  }

  governanceCalendar(): unknown {
    return this.governance.calendar();
  }

  breakGlass(body: { scope: unknown; changes: unknown; reason: string }, actorUser: ActorUser): Promise<unknown> {
    return this.governance.breakGlass({
      actor: this.actor(actorUser),
      scope: body.scope as ConfigScope,
      changes: body.changes as Record<string, unknown>,
      reason: body.reason,
    });
  }

  // POST /test-connection — resolve a key in a context and report reachability.
  async testConnection(params: { key: string; context?: ResolutionContext }): Promise<unknown> {
    const field = this.registry.get(params.key);
    if (!field) throw new ConfigHttpError(404, `unknown key: ${params.key}`);
    const resolved = await this.resolver.resolve(params.key, params.context ?? {});
    return {
      ok: true,
      key: params.key,
      configured: resolved.value != null && resolved.value !== "" && resolved.value !== false,
      secret: this.registry.isSecret(params.key),
      source: resolved.source,
      message: "reachable via resolver",
    };
  }
}

export class ConfigHttpError extends Error {
  readonly status: number;
  readonly detail?: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}
