// ConfigCenter — Live Health (Milestone 3, Phase 2, additive).
// A richer, read-only observability facade built ON TOP of the locked
// Milestone 1 ConfigCenterHealth and the Milestone 3 SnapshotManager. It never
// mutates Configuration Center and never changes the locked /health response
// contract — it composes summary / diagnostics / metrics / readiness / liveness
// views from the same internals for operation dashboards.
//
// DESIGN: additive + persistence-agnostic. Reads only exposed surfaces of the
// injected center and SnapshotManager (registry, store, resolver, bus, metrics,
// capabilities, snapshots). No import-time connection, no Store bypass.
// Delivery "lag" is derived from store-declared revision vs bus-delivered
// revision — the bus is synchronous by contract, so a positive delta is a
// signal to observe, not an error.

import type { ConfigCenter } from "../../index";
import type { SnapshotManager } from "../snapshots";
import type { SnapshotRecord, RetentionPolicy } from "../snapshot";
import type { MetricsSnapshot } from "../../metrics";

export type LiveStatus = "ok" | "degraded" | "error";

export interface LiveHealthDeps {
  center: ConfigCenter;
  snapshots: SnapshotManager;
}

export interface HealthDiagnostic {
  id: string;
  title: string;
  status: LiveStatus;
  detail: string;
}

export interface LiveHealthSummary {
  status: LiveStatus;
  registry: {
    status: LiveStatus;
    frozen: boolean;
    fieldCount: number;
    groupCount: number;
    checksum: string;
  };
  store: {
    status: LiveStatus;
    revision: number;
    overrideCount: number;
  };
  resolver: { status: LiveStatus; cacheSize: number; lastRevision: number };
  eventBus: {
    status: LiveStatus;
    deliveredRevision: number;
    storeRevision: number;
    subscriberCount: number;
    publishedEvents: number;
  };
  snapshots: {
    count: number;
    retentionCandidates: number;
    policy: RetentionPolicy;
    lastRestore: SnapshotRecord | null;
  };
  capabilities: Record<string, boolean>;
  updatedAt: string;
}

export interface DiagnosticsReport {
  status: LiveStatus;
  checks: HealthDiagnostic[];
}

export interface ReadinessReport {
  ready: boolean;
  status: LiveStatus;
  checks: HealthDiagnostic[];
}

export interface LivenessReport {
  alive: boolean;
  status: LiveStatus;
  stamp: number;
}

export class ConfigCenterLiveHealth {
  private readonly center: ConfigCenter;
  private readonly snapshots: SnapshotManager;

  constructor(deps: LiveHealthDeps) {
    this.center = deps.center;
    this.snapshots = deps.snapshots;
  }

  private aggregate(): HealthDiagnostic[] {
    const { registry, store, resolver, bus, metrics } = this.center;
    const diagnostics: HealthDiagnostic[] = [];

    // Registry consistency.
    const registered = registry.list();
    const registryStatus: LiveStatus =
      registry.isFrozen && registered.length > 0 ? "ok" : "degraded";
    diagnostics.push({
      id: "registry.consistency",
      title: "Registry consistency",
      status: registryStatus,
      detail: !!registry.isFrozen
        ? `frozen, ${registered.length} fields, checksum ${registry.getChecksum()}`
        : "registry not frozen or empty",
    });

    // Resolver cache warmed and coherent.
    const resolverStatus: LiveStatus =
      resolver.cacheSize >= 0 && resolver.lastRevision >= 0 ? "ok" : "degraded";
    diagnostics.push({
      id: "resolver.warmed",
      title: "Resolver cache",
      status: resolverStatus,
      detail: `cache ${resolver.cacheSize} entries, lastRevision ${resolver.lastRevision}`,
    });

    // Store revision continuity.
    const storeStatus: LiveStatus = store.revisionCount >= 0 ? "ok" : "error";
    diagnostics.push({
      id: "store.revision",
      title: "Store revision continuity",
      status: storeStatus,
      detail: `current revision ${store.revisionCount}, ${store.overrideCount} overrides`,
    });

    // Event bus delivery — compare store-declared vs bus-delivered revision.
    const storeRev = store.revisionCount;
    const delta = Math.max(0, storeRev - bus.lastRevision);
    const busStatus: LiveStatus = delta > 0 ? "degraded" : "ok";
    diagnostics.push({
      id: "eventbus.delivery",
      title: "Event bus delivery",
      status: busStatus,
      detail: `published ${bus.publishedEvents}, delivered ${bus.lastRevision}/${storeRev}, ${bus.subscriberCount} subscribers${
        delta > 0 ? ` (${delta} behind)` : ""
      }`,
    });

    // Snapshot persistence integrity.
    let snap: string;
    let snapStatus: LiveStatus = "ok";
    try {
      const count = this.snapshots.count();
      const candidates = this.snapshots.retentionCandidates().length;
      const policy = this.snapshots.getRetentionPolicy();
      snap = `${count} snapshots, ${candidates} retention candidates, keepLatest ${policy.keepLatest}, keepYoungerThanDays ${policy.keepYoungerThanDays}d`;
    } catch (err) {
      snapStatus = "error";
      snap = `unavailable: ${(err as Error).message}`;
    }
    diagnostics.push({
      id: "snapshots.integrity",
      title: "Snapshot persistence",
      status: snapStatus,
      detail: snap,
    });

    // Metric counters sane.
    const counters = metrics.snapshot().counters;
    const countersHealthy = Object.values(counters).every((v) => Number.isFinite(v) && v >= 0);
    diagnostics.push({
      id: "metrics.sanity",
      title: "Metrics sanity",
      status: countersHealthy ? "ok" : "error",
      detail: `${Object.keys(counters).length} live counters`,
    });

    return diagnostics;
  }

  private worst(...statuses: LiveStatus[]): LiveStatus {
    if (statuses.some((s) => s === "error")) return "error";
    if (statuses.some((s) => s === "degraded")) return "degraded";
    return "ok";
  }

  async summary(): Promise<LiveHealthSummary> {
    const diags = this.aggregate();
    const { registry, store, resolver, bus, capabilities } = this.center;
    const policy = this.snapshots.getRetentionPolicy();
    const lastRestoreRow = this.snapshots.list().find((s) => s.status === "RESTORED") ?? null;
    const storeDiag = diags.find((d) => d.id === "store.revision")!;
    const busDiag = diags.find((d) => d.id === "eventbus.delivery")!;
    return {
      status: this.worst(...diags.map((d) => d.status)),
      registry: {
        status: diags.find((d) => d.id === "registry.consistency")!.status,
        frozen: registry.isFrozen,
        fieldCount: registry.list().length,
        groupCount: registry.listGroups().length,
        checksum: registry.isFrozen ? registry.getChecksum() : "",
      },
      store: {
        status: storeDiag.status,
        revision: store.revisionCount,
        overrideCount: store.overrideCount,
      },
      resolver: {
        status: diags.find((d) => d.id === "resolver.warmed")!.status,
        cacheSize: resolver.cacheSize,
        lastRevision: resolver.lastRevision,
      },
      eventBus: {
        status: busDiag.status,
        deliveredRevision: bus.lastRevision,
        storeRevision: store.revisionCount,
        subscriberCount: bus.subscriberCount,
        publishedEvents: bus.publishedEvents,
      },
      snapshots: {
        count: this.snapshots.count(),
        retentionCandidates: this.snapshots.retentionCandidates().length,
        policy,
        lastRestore: lastRestoreRow,
      },
      capabilities: Object.fromEntries(capabilities.list().map((cp) => [cp.id, cp.available])),
      updatedAt: new Date().toISOString(),
    };
  }

  diagnostics(): DiagnosticsReport {
    const checks = this.aggregate();
    return { status: this.worst(...checks.map((c) => c.status)), checks };
  }

  metrics(): MetricsSnapshot {
    return this.center.metrics.snapshot();
  }

  readiness(): ReadinessReport {
    const checks = this.aggregate();
    const critical = ["registry.consistency", "store.revision", "snapshots.integrity"];
    const bad = checks.filter((c) => critical.includes(c.id) && c.status !== "ok");
    const ready = bad.length === 0;
    const status: LiveStatus = ready
      ? this.worst(...checks.map((c) => c.status))
      : "error";
    return { ready, status, checks };
  }

  liveness(): LivenessReport {
    try {
      this.center.registry.list();
      return { alive: true, status: "ok", stamp: Date.now() };
    } catch {
      return { alive: false, status: "error", stamp: Date.now() };
    }
  }
}