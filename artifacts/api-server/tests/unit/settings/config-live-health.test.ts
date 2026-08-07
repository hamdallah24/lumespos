// ConfigCenter — Milestone 3 Phase 2: Live Health tests.
// Verifies the additive observability facade: summary / diagnostics / metrics /
// readiness / liveness composed from the center + SnapshotManager. These views
// are read-only, never mutate Configuration Center, and do not touch the locked
// /health contract.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import { ConfigCenterLiveHealth } from "../../../src/settings/api/health/source";

let center: ConfigCenter;
let manager: SnapshotManager;
let live: ConfigCenterLiveHealth;

beforeAll(async () => {
  center = await initConfigCenter();
  const persistence = new MemorySnapshotPersistence();
  manager = new SnapshotManager({
    store: center.store,
    resolver: center.resolver,
    pipeline: center.pipeline,
    registry: center.registry,
    persistence,
  });
  live = new ConfigCenterLiveHealth({ center, snapshots: manager });
});

describe("Live Health — summary", () => {
  it("returns an aggregated status and updatedAt", async () => {
    const s = await live.summary();
    expect(["ok", "degraded", "error"]).toContain(s.status);
    expect(typeof s.updatedAt).toBe("string");
    expect(new Date(s.updatedAt).getTime()).toBeGreaterThan(0);
  });

  it("reflects the frozen registry checksum from the locked foundation", async () => {
    const s = await live.summary();
    expect(s.registry.frozen).toBe(center.registry.isFrozen);
    expect(s.registry.checksum).toBe(center.registry.getChecksum());
    expect(s.registry.fieldCount).toBe(center.registry.list().length);
  });

  it("reports store revision and override count from live state", async () => {
    const s = await live.summary();
    expect(s.store.revision).toBe(center.store.revisionCount);
    expect(s.store.overrideCount).toBe(center.store.overrideCount);
  });

  it("reports event bus delivery vs store revision", async () => {
    const s = await live.summary();
    expect(s.eventBus.deliveredRevision).toBe(center.bus.lastRevision);
    expect(s.eventBus.storeRevision).toBe(center.store.revisionCount);
    expect(s.eventBus.subscriberCount).toBe(center.bus.subscriberCount);
  });

  it("reports snapshot counts and retention policy", async () => {
    const s = await live.summary();
    expect(s.snapshots.count).toBe(manager.count());
    expect(s.snapshots.retentionCandidates).toBe(manager.retentionCandidates().length);
    expect(s.snapshots.policy.keepLatest).toBeDefined();
    expect(s.snapshots.policy.keepYoungerThanDays).toBeDefined();
  });

  it("surfaces a RESTORED snapshot as lastRestore", async () => {
    const snap = await manager.capture({ name: "live-restore-marker", scope: { type: "workspace", workspaceId: 900 }, actor: "owner" });
    await manager.restore({ id: snap.id, actor: { actorId: "owner", role: "owner", branchId: null, workspaceId: 900 } });
    const s = await live.summary();
    expect(s.snapshots.lastRestore).not.toBeNull();
    expect(s.snapshots.lastRestore!.id).toBe(snap.id);
  });
});

describe("Live Health — diagnostics", () => {
  it("returns a status plus a list of checks", () => {
    const d = live.diagnostics();
    expect(["ok", "degraded", "error"]).toContain(d.status);
    expect(d.checks.length).toBeGreaterThan(0);
    const ids = d.checks.map((c) => c.id);
    expect(ids).toContain("registry.consistency");
    expect(ids).toContain("store.revision");
    expect(ids).toContain("snapshots.integrity");
    expect(ids).toContain("eventbus.delivery");
  });

  it("each diagnostic has a title and detail", () => {
    for (const c of live.diagnostics().checks) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.detail.length).toBeGreaterThan(0);
      expect(["ok", "degraded", "error"]).toContain(c.status);
    }
  });
});

describe("Live Health — metrics / readiness / liveness", () => {
  it("metrics returns counters and latencies", async () => {
    await center.resolver.resolve("runtime.ric.enabled", {});
    const m = live.metrics();
    expect(typeof m.counters).toBe("object");
    expect(typeof m.latencies).toBe("object");
  });

  it("readiness is derived from critical checks", () => {
    const r = live.readiness();
    expect(typeof r.ready).toBe("boolean");
    expect(["ok", "degraded", "error"]).toContain(r.status);
    expect(r.checks.length).toBeGreaterThan(0);
    // registry + store + snapshots are never collected as non-critical here.
    for (const c of r.checks) {
      if (["registry.consistency", "store.revision", "snapshots.integrity"].includes(c.id)) {
        expect(["ok", "degraded"]).toContain(c.status);
      }
    }
  });

  it("liveness is alive and healthy on a live center", () => {
    const l = live.liveness();
    expect(l.alive).toBe(true);
    expect(l.status).toBe("ok");
    expect(typeof l.stamp).toBe("number");
  });
});

describe("Live Health — additive contract integrity", () => {
  it("never mutates the registry or the store", async () => {
    const revBefore = center.store.revisionCount;
    const overridesBefore = center.store.overrideCount;
    await live.summary();
    live.diagnostics();
    live.readiness();
    expect(center.store.revisionCount).toBe(revBefore);
    expect(center.store.overrideCount).toBe(overridesBefore);
  });
});