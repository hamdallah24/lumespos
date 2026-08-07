// ConfigCenter — REST Router (Milestone 2 user layer).
// Thin HTTP mapping. Controller stays business-logic free; inheritance/resolution
// live in the Resolver, governance in the Pipeline, catalog in the Registry.
// All changes flow Controller → ConfigCenter → Pipeline → Store — never a bypass.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { getConfigCenter } from "../index";
import { SnapshotManager } from "./snapshots";
import { PackageStore, type ConfigPackage } from "./packages";
import { SettingsController, ConfigHttpError } from "./controller";
import { GovernanceRequestError } from "../governance";
import * as schemas from "./schemas";

const router: Router = Router();

// Lazily build the controller from the singleton ConfigCenter. Keeps this route
// module free of business logic and guarantees a single ConfigCenter instance.
let cached: { controller: SettingsController } | null = null;

function resolveController() {
  if (!cached) {
    const center = getConfigCenter();
    const snapshots = new SnapshotManager({ store: center.store, resolver: center.resolver, pipeline: center.pipeline });
    const packages = new PackageStore(center.registry, center.pipeline);
    // Seed an example package built entirely from declared catalog fields.
    seedDefaultPackages(packages, center);
    cached = { controller: new SettingsController({ center, snapshots, packages }) };
  }
  return cached.controller;
}

function seedDefaultPackages(packages: PackageStore, center: ReturnType<typeof getConfigCenter>) {
  const runtime: ConfigPackage = {
    id: "runtime.baseline",
    name: "Runtime Baseline",
    version: "1.0.0",
    description: "Default runtime toggles (metadata-defined keys only).",
    category: "runtime",
    changes: bundle(center, {
      "runtime.ric.enabled": true,
      "runtime.executive.enabled": true,
    }),
  };
  try {
    packages.register(runtime);
  } catch {
    // ignore — registry not frozen with these keys in dev tests
  }
}

// Collect only declared keys into a package payload (whitelist guard is in store).
function bundle(center: ReturnType<typeof getConfigCenter>, seed: Record<string, boolean>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(seed)) {
    if (center.registry.has(k)) out[k] = v;
  }
  return out;
}

// ── Shared helpers ────────────────────────────────────────────────────────
function actorFrom(req: Request) {
  const u = req.user as { id?: number; role?: string; branchId?: number | null; workspaceId?: number | null } | undefined;
  return { id: Number(u?.id ?? 0), role: u?.role ?? "viewer", branchId: u?.branchId ?? null, workspaceId: u?.workspaceId ?? null };
}

function queryCtx(req: Request) {
  const p = schemas.contextQuerySchema.safeParse(req.query);
  return p.success ? p.data : {};
}

// GET /api/v1/settings
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.listQuerySchema.safeParse(req.query);
    const data = await resolveController().list({ category: p.success ? p.data.category : undefined, search: p.success ? p.data.search : undefined });
    res.json(schemas.listResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/resolved
router.get("/resolved", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().resolved(queryCtx(req));
    res.json(schemas.resolvedResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/trace
router.get("/trace", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.traceQuerySchema.safeParse(req.query);
    if (!p.success || !p.data.key) {
      res.status(400).json({ error: "key query param is required" });
      return;
    }
    const data = await resolveController().trace(p.data.key, p.data);
    res.json(schemas.traceResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/snapshots
router.get("/snapshots", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query["search"] === "string" ? req.query["search"] : "";
    const data = await resolveController().listSnapshots(q);
    res.json(schemas.snapshotsListResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots — capture with origin/environment/reason (M3)
router.post("/snapshots", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.captureBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().captureSnapshot(p.data, actorFrom(req));
    res.json(schemas.snapshotFullSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/snapshots/:id — one snapshot + fingerprint + origin + status
router.get("/snapshots/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const data = await resolveController().getSnapshot(id);
    res.json(schemas.snapshotFullSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/:id/verify — restore verification (never commits)
router.post("/snapshots/:id/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const data = await resolveController().verifySnapshot(id);
    res.json(schemas.verificationResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/:id/restore — restore via Governance Pipeline
router.post("/snapshots/:id/restore", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const data = await resolveController().restoreSnapshot({ snapshotId: id }, actorFrom(req));
    res.json(schemas.restoreResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/:id/pin — manual pin (retention-safe)
router.post("/snapshots/:id/pin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const data = await resolveController().pinSnapshot(id);
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/:id/unpin
router.post("/snapshots/:id/unpin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const data = await resolveController().unpinSnapshot(id);
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/v1/settings/snapshots/:id/compare/:otherId — field-level diff
router.get("/snapshots/:id/compare/:otherId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params["id"]);
    const other = String(req.params["otherId"]);
    const data = await resolveController().compareSnapshots(id, other);
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/retention — set retention policy + candidates (M3)
router.post("/snapshots/retention", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.retentionPolicySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().snapshotRetention(p.data);
    res.json(schemas.retentionResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/snapshots/gc — run garbage collection (emits audit event)
router.post("/snapshots/gc", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().snapshotGc();
    res.json(schemas.gcResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/packages
router.get("/packages", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().listPackages();
    res.json(schemas.packagesListResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/health
router.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().health();
    res.json(schemas.healthResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// ── Live Health (M3 Phase 2, additive) ────────────────────────────────────
router.get("/health/summary", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().healthSummary();
    res.json(schemas.healthSummaryResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/health/diagnostics", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().healthDiagnostics();
    res.json(schemas.healthDiagnosticsResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/health/metrics", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().healthMetrics();
    res.json(schemas.healthMetricsResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/health/readiness", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().healthReadiness();
    res.json(schemas.healthReadinessResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/health/liveness", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().healthLiveness();
    res.json(schemas.healthLivenessResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/preview
router.post("/preview", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.planBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().preview(p.data, actorFrom(req));
    res.json(schemas.previewResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/simulate
router.post("/simulate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.planBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().simulate(p.data, actorFrom(req));
    res.json(schemas.simulateResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/impact
router.post("/impact", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.planBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().impact(p.data, actorFrom(req));
    res.json(schemas.impactResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/policy-check
router.post("/policy-check", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.planBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().checkPolicy(p.data, actorFrom(req));
    res.json(schemas.policyResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/restore
router.post("/restore", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.restoreBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().restoreSnapshot(p.data, actorFrom(req));
    res.json(schemas.restoreResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/packages/install
router.post("/packages/install", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.installBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().installPackage(p.data, actorFrom(req));
    res.json(schemas.installResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/test-connection
router.post("/test-connection", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.testConnectionBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().testConnection(p.data);
    res.json(schemas.testConnectionResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// ── Audit Center (M3 Phase 3, additive read-only) ─────────────────────────
router.get("/audit/timeline", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.auditTimelineQuerySchema.safeParse(req.query);
    const data = resolveController().auditTimeline(p.success ? p.data : {});
    res.json(schemas.auditTimelineResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/audit/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.auditSearchQuerySchema.safeParse(req.query);
    const data = resolveController().auditSearch(p.success ? p.data : {});
    res.json(schemas.auditTimelineResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/audit/correlation/:correlationId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().auditCorrelation(String(req.params["correlationId"]));
    res.json(schemas.correlationGraphResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.get("/audit/export", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().auditExport() as { filename: string; content: string };
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
    res.send(data.content);
  } catch (err) { next(err); }
});

router.get("/audit/:revision", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rev = Number(req.params["revision"]);
    const data = await resolveController().auditRevision(Number.isFinite(rev) ? rev : -1);
    res.json(schemas.auditRevisionDetailSchema.parse(data));
  } catch (err) { next(err); }
});

// ── Drift Detection (M4 Phase 3, additive read-only) ───────────────────────
// GET /api/v1/settings/drift — run a fresh drift (read-only).
router.get("/drift", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().drift();
    res.json(schemas.driftReportResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/drift/status — last drift report (no re-run).
router.get("/drift/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.driftStatusResponseSchema.parse(resolveController().driftStatus()));
  } catch (err) { next(err); }
});

// ── Maintenance Service (M4 Phase 4, additive read-only) ────────────────────
// GET /api/v1/settings/maintenance — current operational status + metrics.
router.get("/maintenance", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.maintenanceStatusResponseSchema.parse(resolveController().maintenanceStatus()));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/maintenance/history — bounded cycle journal.
router.get("/maintenance/history", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.maintenanceHistoryResponseSchema.parse(resolveController().maintenanceHistory()));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/maintenance/run — trigger one cycle manually (read-only
// for configuration; runs the orchestrator and returns the completed cycle).
router.post("/maintenance/run", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await resolveController().maintenanceRun();
    res.json(schemas.maintenanceCycleSchema.parse(data));
  } catch (err) { next(err); }
});

// GET + PUT /api/v1/settings/:key
router.get("/:key", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params["key"]);
    const data = await resolveController().getField(key, queryCtx(req));
    res.json(schemas.getFieldResponseSchema.parse(data));
  } catch (err) { next(err); }
});

router.put("/:key", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params["key"]);
    const p = schemas.commitBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().update(key, p.data, actorFrom(req));
    if (data && typeof data === "object" && "status" in data && (data as { status?: string }).status === "pending") {
      res.status(202).json(schemas.pendingCommitResponseSchema.parse(data));
      return;
    }
    res.json(schemas.commitResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// ── Governance & Approval (M5 Phase 1, additive) ────────────────────────────
// POST /api/v1/settings/governance/propose — evaluate policy; DIRECT commits or
// opens an ApprovalRequest (202).
router.post("/governance/propose", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.proposalBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const proposal = await resolveController().proposeChange(p.data, actorFrom(req));
    if (proposal.mode === "invalid") { res.status(422).json({ error: "validation failed", detail: proposal.errors }); return; }
    if (proposal.mode === "blocked") { res.status(403).json({ error: proposal.reason }); return; }
    if (proposal.mode === "direct") {
      const run = proposal.run;
      res.json(schemas.proposalResponseSchema.parse({
        mode: "direct",
        revision: run.revision,
        correlationId: run.correlationId,
        state: run.state,
        scope: run.scope,
        changedKeys: Object.keys(run.changes),
      }));
      return;
    }
    res.status(202).json(schemas.proposalResponseSchema.parse({ mode: "approval", request: proposal.request }));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/requests — list approval requests
// (pagination + sort + filter + search, M5 P2).
router.get("/governance/requests", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.approvalListQuerySchema.safeParse(req.query);
    const data = resolveController().approvalList(p.success ? p.data : {});
    res.json(schemas.approvalListResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/requests/:id/detail — full immutable timeline.
router.get("/governance/requests/:id/detail", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().approvalDetail(String(req.params["id"]));
    res.json(schemas.approvalDetailResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/requests/:id
router.get("/governance/requests/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().approvalGet(String(req.params["id"]));
    res.json(schemas.approvalRequestSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/governance/requests/:id/approve — cast approval vote;
// on quorum the request commits through the pipeline (single revision).
router.post("/governance/requests/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.voteBodySchema.safeParse(req.body);
    const data = await resolveController().approvalApprove(
      String(req.params["id"]),
      actorFrom(req),
      p.success ? p.data.note : undefined,
      p.success ? p.data.expectedVersion : undefined,
    );
    res.json(schemas.approvalApproveResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/governance/requests/:id/reject — one rejection vetoes.
router.post("/governance/requests/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.voteBodySchema.safeParse(req.body);
    const data = resolveController().approvalReject(
      String(req.params["id"]),
      actorFrom(req),
      p.success ? p.data.note : undefined,
      p.success ? p.data.expectedVersion : undefined,
    );
    res.json(schemas.approvalRequestSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/governance/requests/:id/cancel — requester or owner.
router.post("/governance/requests/:id/cancel", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.voteBodySchema.safeParse(req.body);
    const data = resolveController().approvalCancel(
      String(req.params["id"]),
      actorFrom(req),
      p.success ? p.data.expectedVersion : undefined,
    );
    res.json(schemas.approvalRequestSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /api/v1/settings/governance/expire — auto-expire overdue pending (TTL).
router.post("/governance/expire", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().approvalExpire();
    res.json(schemas.approvalExpireResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/attention — escalation/reminder hook surface.
router.get("/governance/attention", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.attentionQuerySchema.safeParse(req.query);
    const data = resolveController().approvalAttention(p.success ? p.data : {});
    res.json(schemas.approvalAttentionResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// ── Operational governance — Freeze / Window / Calendar / Break-glass (M5 P3) ─
// POST /governance/freeze — create a change freeze (global/workspace/branch/executive + keys).
router.post("/governance/freeze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.freezeCreateBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = resolveController().freezeCreate(p.data, actorFrom(req));
    res.json(schemas.freezeDefinitionSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /governance/freeze — list all freezes.
router.get("/governance/freeze", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.freezeListResponseSchema.parse({ items: resolveController().freezeList() }));
  } catch (err) { next(err); }
});

// POST /governance/freeze/:id/revoke — lift a freeze.
router.post("/governance/freeze/:id/revoke", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().freezeRevoke(String(req.params["id"]), actorFrom(req));
    res.json(schemas.freezeDefinitionSchema.parse(data));
  } catch (err) { next(err); }
});

// POST /governance/windows + create a maintenance window.
router.post("/governance/windows", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.windowCreateBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = resolveController().windowCreate(p.data, actorFrom(req));
    res.json(schemas.windowDefinitionSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /governance/windows — list windows.
router.get("/governance/windows", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.windowListResponseSchema.parse({ items: resolveController().windowList() }));
  } catch (err) { next(err); }
});

// DELETE /governance/windows/:id — remove a window.
router.delete("/governance/windows/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resolveController().windowRemove(String(req.params["id"]), actorFrom(req));
    res.json(schemas.windowRemoveResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /governance/calendar — read-only projection (active/next window, freeze status).
router.get("/governance/calendar", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.governanceCalendarSchema.parse(resolveController().governanceCalendar()));
  } catch (err) { next(err); }
});

// POST /governance/break-glass — emergency override (owner/admin), fully audited.
router.post("/governance/break-glass", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = schemas.breakGlassBodySchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: "invalid body", detail: p.error.issues }); return; }
    const data = await resolveController().breakGlass(p.data, actorFrom(req));
    res.json(schemas.breakGlassResponseSchema.parse(data));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/policies — policy matrix (read-only).
router.get("/governance/policies", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.policyMatrixResponseSchema.parse(resolveController().governancePolicies()));
  } catch (err) { next(err); }
});

// GET /api/v1/settings/governance/status — counts by state.
router.get("/governance/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(schemas.governanceCountsSchema.parse(resolveController().governanceCounts()));
  } catch (err) { next(err); }
});

// Central error mapping — zod/config errors to HTTP status codes.
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ConfigHttpError) {
    res.status(err.status).json({ error: err.message, detail: err.detail });
    return;
  }
  if (err instanceof GovernanceRequestError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof Error && /unknown configuration key/.test(err.message)) {
    res.status(404).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err instanceof Error ? err.message : "internal error" });
});

export default router;