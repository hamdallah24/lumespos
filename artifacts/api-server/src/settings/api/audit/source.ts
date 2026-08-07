// ConfigCenter — Audit Center (Milestone 3, Phase 3, additive).
// Read-only operational intelligence layered OVER the existing authoritative
// audit trails. It does NOT add new event logs, does NOT replace existing audit
// logs, and NEVER mutates Configuration Center or the Pipeline.
//
// The source of truth for every committed change is the immutable Store revision
// log (store.log). Audit Center indexes, correlates, searches and exports it,
// and enriches each revision with:
//   • before/after/diff  → derived by REPLAYING the Store log (pure derivation)
//   • pipeline gates      → re-derived via read-only pipeline.plan()
//   • snapshot linkage    → via snapshot.metadata.sourceRevision
//   • restore origin      → a snapshot whose status is RESTORED at this revision
//   • health correlation  → ConfigCenterHealth.report() snapshot

import type { ConfigCenter } from "../../index";
import type { SnapshotManager } from "../snapshots";
import { REGISTRY_CONFIG_VERSION } from "../../defaults";

import type {
  AuditEvent,
  AuditTimeline,
  AuditFilters,
  AuditSearchQuery,
  AuditRevisionDetail,
  AuditRestoreOrigin,
  AuditSnapshotRef,
  ChangeDiffEntry,
  CorrelationGraph,
  CorrelationNode,
  CorrelationEdge,
  PipelineGate,
  ConfigAuditScope,
} from "./types";

// Re-export transport types for the controller/schemas.
export type {
  AuditEvent,
  AuditTimeline,
  AuditFilters,
  AuditSearchQuery,
  AuditRevisionDetail,
  AuditRestoreOrigin,
  AuditSnapshotRef,
  ChangeDiffEntry,
  CorrelationGraph,
  CorrelationNode,
  CorrelationEdge,
  PipelineGate,
  ConfigAuditScope,
};

export interface ConfigAuditDeps {
  center: ConfigCenter;
  snapshots: SnapshotManager;
}

type RevisionLike = {
  sequence: number;
  scope: ConfigAuditScope;
  changes: Record<string, unknown>;
  correlationId: string;
  actor: string;
  timestamp: Date;
};

function toAuditScope(scope: { type: string; workspaceId?: number | null; branchId?: number | null; executiveRole?: string | null }): ConfigAuditScope {
  return {
    type: scope.type,
    workspaceId: scope.workspaceId ?? null,
    branchId: scope.branchId ?? null,
    executiveRole: scope.executiveRole ?? null,
  };
}

function scopeKey(scope: ConfigAuditScope): string {
  return `${scope.type}:${scope.workspaceId ?? ""}:${scope.branchId ?? ""}:${scope.executiveRole ?? ""}`;
}

function inRange(timestamp: string, from?: string, to?: string): boolean {
  if (from && timestamp < from) return false;
  if (to && timestamp > to) return false;
  return true;
}

export class ConfigAuditCenter {
  private readonly center: ConfigCenter;
  private readonly snapshots: SnapshotManager;

  constructor(deps: ConfigAuditDeps) {
    this.center = deps.center;
    this.snapshots = deps.snapshots;
  }

  // ── Phase 3.1 — Timeline ────────────────────────────────────────────────
  timeline(filters: AuditFilters = {}): AuditTimeline {
    let events = this.buildRevisionEvents();
    events = events.concat(this.buildSnapshotEvents());
    if (filters.origin) events = events.filter((e) => e.origin === filters.origin);
    if (filters.from || filters.to) events = events.filter((e) => inRange(e.timestamp, filters.from, filters.to));
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const limited = filters.limit && filters.limit > 0 ? events.slice(0, filters.limit) : events;
    return { total: events.length, events: limited };
  }

  // ── Phase 3.2 — Search / Explorer ───────────────────────────────────────
  search(query: AuditSearchQuery = {}): AuditTimeline {
    let events = this.buildRevisionEvents();
    if (query.actor) events = events.filter((e) => e.actor === query.actor);
    if (query.scopeType) events = events.filter((e) => e.scope && e.scope["type"] === query.scopeType);
    if (query.revision != null) events = events.filter((e) => e.revision === query.revision);
    if (query.correlationId) events = events.filter((e) => e.correlationId === query.correlationId);
    if (query.triggerType) events = events.filter((e) => e.triggerType === query.triggerType);
    if (query.status) events = events.filter((e) => e.status === query.status);
    if (query.from || query.to) events = events.filter((e) => inRange(e.timestamp, query.from, query.to));
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { total: events.length, events };
  }

  // ── Phase 3.3 — Change Details (one revision) ───────────────────────────
  async revision(revisionNo: number): Promise<AuditRevisionDetail | null> {
    const rec = this.log().find((r) => r.sequence === revisionNo);
    if (!rec) return null;

    const state = this.replayBefore(rec);
    const snapshots = this.snapshots.list()
      .filter((s) => s.metadata.sourceRevision === revisionNo)
      .map((s): AuditSnapshotRef => ({
        id: s.id,
        name: s.name,
        status: s.status,
        createdAt: s.createdAt,
        origin: s.origin,
        triggerType: s.triggerType,
      }));

    const restoreOrigin = this.findRestoreOrigin(revisionNo);

    const gates = await this.deriveGates(rec);
    const health = await this.healthSnapshot();

    return {
      revision: rec.sequence,
      correlationId: rec.correlationId,
      actor: rec.actor,
      scope: { ...rec.scope },
      timestamp: rec.timestamp.toISOString(),
      changedKeys: Object.keys(rec.changes),
      before: state.before,
      after: { ...rec.changes },
      diff: Object.entries(rec.changes).map(([key, after]): ChangeDiffEntry => {
        const before = state.before[key];
        return { key, before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
      }),
      gates,
      snapshots,
      restoreOrigin,
      configVersion: REGISTRY_CONFIG_VERSION,
      health,
    };
  }

  // ── Phase 3.4 — Correlation Graph ───────────────────────────────────────
  async correlation(correlationId: string): Promise<CorrelationGraph | null> {
    const rec = this.log().find((r) => r.correlationId === correlationId);
    if (!rec) return null;

    const nodes: CorrelationNode[] = [];
    const edges: CorrelationEdge[] = [];
    const changeId = "change";
    const revisionId = "revision";
    const snapshotId = "snapshot";
    const auditId = "audit";
    const eventId = "event";
    const healthId = "health";

    nodes.push({
      kind: "change",
      label: `Configuration Change`,
      data: { correlationId, changedKeys: Object.keys(rec.changes), actor: rec.actor },
    });
    nodes.push({
      kind: "revision",
      label: `Revision ${rec.sequence}`,
      data: { revision: rec.sequence, timestamp: rec.timestamp.toISOString() },
    });
    edges.push({ from: changeId, to: revisionId, relation: "produced" });

    const relatedSnapshots = this.snapshots.list()
      .filter((s) => s.metadata.sourceRevision === rec.sequence || s.metadata.correlationId === correlationId);
    for (let i = 0; i < relatedSnapshots.length; i++) {
      const s = relatedSnapshots[i];
      const nodeId = `snapshot-${i}`;
      nodes.push({ kind: "snapshot", label: `Snapshot ${s.name}`, data: { id: s.id, status: s.status } });
      edges.push({ from: revisionId, to: nodeId, relation: s.metadata.sourceRevision === rec.sequence ? "captured" : "linked" });
    }

    nodes.push({ kind: "audit", label: `Audit ${correlationId}`, data: { correlationId } });
    edges.push({ from: revisionId, to: auditId, relation: "audited" });

    // Event delivery correlation — bus delivered at least this revision.
    nodes.push({ kind: "event", label: "ConfigurationChanged event", data: { delivered: this.center.bus.lastRevision } });
    edges.push({ from: revisionId, to: eventId, relation: "published" });

    // Health correlated snapshot.
    const health = await this.healthSnapshot();
    nodes.push({ kind: "health", label: `Health ${health.status}`, data: health });
    edges.push({ from: revisionId, to: healthId, relation: "observed" });

    // Restore — a RESTORED snapshot at or after this revision.
    const restore = this.snapshots.list().find((s) => s.status === "RESTORED" && (s.metadata.sourceRevision ?? 0) >= rec.sequence);
    if (restore) {
      const restoreId = "restore";
      nodes.push({ kind: "restore", label: `Restore ${restore.name}`, data: { id: restore.id, createdAt: restore.createdAt } });
      edges.push({ from: revisionId, to: restoreId, relation: "restored" });
    }

    return { correlationId, nodes, edges };
  }

  // ── Export (timeline as JSON lines / CSV) ───────────────────────────────
  exportCsv(): string {
    const events = this.buildRevisionEvents();
    const header = "origin,timestamp,revision,correlationId,actor,scopeType,changedKeys,triggerType,status";
    const rows = events.map((e) =>
      [
        e.origin,
        e.timestamp,
        e.revision ?? "",
        e.correlationId ?? "",
        e.actor ?? "",
        e.scope ? String(e.scope["type"]) : "",
        e.changedKeys.join("|"),
        e.triggerType ?? "",
        e.status ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );
    return [header, ...rows].join("\n");
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private log() {
    return this.center.store.log as unknown as RevisionLike[];
  }

  private buildRevisionEvents(): AuditEvent[] {
    const events: AuditEvent[] = [];
    for (const rec of this.log()) {
      const snapshot = this.snapshots.list().find((s) => s.metadata.sourceRevision === rec.sequence);
      events.push({
        id: `rev-${rec.sequence}`,
        origin: "revision",
        timestamp: rec.timestamp.toISOString(),
        revision: rec.sequence,
        correlationId: rec.correlationId,
        actor: rec.actor,
        scope: { ...rec.scope },
        changedKeys: Object.keys(rec.changes),
        triggerType: snapshot?.triggerType ?? "manual",
        status: snapshot ? snapshot.status : "COMMITTED",
      });
    }
    return events;
  }

  private buildSnapshotEvents(): AuditEvent[] {
    const events: AuditEvent[] = [];
    for (const s of this.snapshots.list()) {
      events.push({
        id: `snap-${s.id}`,
        origin: "snapshot",
        timestamp: s.createdAt,
        correlationId: s.metadata.correlationId,
        actor: s.metadata.actor,
        scope: { ...s.scope },
        changedKeys: Object.keys(s.changes),
        triggerType: s.triggerType,
        status: s.status,
        message: `${s.origin} capture${s.pinned ? " (pinned)" : ""}`,
        metadata: { revisionNo: s.revisionNo, environment: s.environment },
      });
    }
    return events;
  }

  // Replay the log up to (not including) `rec` to reconstruct prior override
  // state for the keys changed by `rec`. Pure derivation from the immutable log.
  private replayBefore(rec: RevisionLike): { before: Record<string, unknown> } {
    const effective = new Map<string, unknown>();
    for (const r of this.log()) {
      if (r.sequence >= rec.sequence) break;
      for (const [key, value] of Object.entries(r.changes)) {
        // Most recent commit wins for the same scope bucket; keep a simple
        // single-slot per key (default-scope approximation for audit display).
        const bucket = scopeKey(r.scope);
        const marker = `${bucket}::${key}`;
        effective.set(marker, value);
      }
    }
    const before: Record<string, unknown> = {};
    for (const key of Object.keys(rec.changes)) {
      const bucket = scopeKey(rec.scope);
      const marker = `${bucket}::${key}`;
      before[key] = effective.get(marker) ?? this.registryDefault(key);
    }
    return { before };
  }

  private registryDefault(key: string): unknown {
    const meta = this.center.registry.get(key);
    return meta ? meta.defaultValue : null;
  }

  private findRestoreOrigin(revisionNo: number): AuditRestoreOrigin | null {
    const restored = this.snapshots.list().find((s) => s.status === "RESTORED" && s.revisionNo <= revisionNo);
    if (!restored) return null;
    return {
      snapshotId: restored.id,
      name: restored.name,
      createdAt: restored.createdAt,
      actor: restored.metadata.actor,
      reason: restored.metadata.reason,
    };
  }

  // Approximate pipeline gates for a historical revision. Re-derives through the
  // read-only plan() evaluator using the current registry + role derived from the
  // recorded actor (best-effort — the pipeline did not persist its run in M1).
  // A revision that exists in the immutable log ALREADY PASSED every gate at
  // commit time, so ok=false is only surfaced when the current registry disagrees
  // with the recorded change (a drift signal, not a historical verdict).
  private async deriveGates(rec: RevisionLike): Promise<PipelineGate[]> {
    const gates: PipelineGate[] = [];
    const scope = this.asConfigScope(rec.scope);

    // VALIDATE — schema/immutable/scope via the registry (deterministic).
    const fieldErrors: string[] = [];
    for (const [key, value] of Object.entries(rec.changes)) {
      try {
        const meta = this.center.registry.require(key);
        if (meta.immutable) fieldErrors.push(`${key} is immutable`);
        if (!meta.scope.includes(scope.type)) fieldErrors.push(`${key} not allowed at ${scope.type}`);
        for (const e of this.center.registry.validateField(key, value)) fieldErrors.push(e.message);
      } catch (err) {
        fieldErrors.push((err as Error).message);
      }
    }
    gates.push({ stage: "VALIDATE", ok: fieldErrors.length === 0, detail: fieldErrors.length ? fieldErrors.join("; ") : "schema ok (recorded revision passed)", data: fieldErrors });

    // POLICY — best-effort RBAC. Committed revisions passed at commit time; the
    // check below only reports drift when the actor resolves to a recognized role.
    const role = this.asRole(rec.actor);
    const policy = role
      ? this.center.security.canWrite(role, scope)
      : { ok: true };
    gates.push({ stage: "POLICY", ok: policy.ok, detail: role ? (policy.ok ? "authorized (recorded role)" : policy.reason) : "recorded revision committed — RBAC enforced at commit", data: policy });

    // SIMULATION / IMPACT — read-only estimates from the registry metadata.
    const simResult = await this.center.pipeline.plan({ actor: { actorId: rec.actor, role: role ?? "viewer", branchId: null, workspaceId: null }, scope, changes: rec.changes });
    gates.push({ stage: "SIMULATION", ok: true, data: simResult.simulation ?? [] });
    gates.push({ stage: "IMPACT", ok: true, data: simResult.impact ?? [] });
    gates.push({ stage: "HEALTH", ok: true, detail: "dry-run (no live probes)", data: simResult.health });
    return gates;
  }

  private asConfigScope(s: ConfigAuditScope): import("../../types").ConfigScope {
    return {
      type: s.type as import("../../types").ConfigScope["type"],
      workspaceId: s.workspaceId ?? undefined,
      branchId: s.branchId ?? undefined,
      executiveRole: (s.executiveRole ?? undefined) as import("../../types").ExecutiveRole | undefined,
    };
  }

  private asRole(actor: string): import("../../security").ConfigRole | null {
    const known: import("../../security").ConfigRole[] = ["owner", "manager", "admin", "developer", "viewer"];
    return known.includes(actor as never) ? (actor as import("../../security").ConfigRole) : null;
  }

  private async healthSnapshot(): Promise<Record<string, unknown>> {
    try {
      const report = await this.center.health.report();
      return {
        status: report.status,
        registry: report.registry.status,
        store: report.store.status,
        resolver: report.resolver.status,
        eventBus: report.eventBus.status,
      };
    } catch {
      return { status: "unknown" };
    }
  }
}
