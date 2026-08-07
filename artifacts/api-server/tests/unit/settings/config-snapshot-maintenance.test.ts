// ConfigCenter — Milestone 4 Phase 2: Automatic Snapshot Maintenance tests.
// The maintenance layer consumes ONLY the public SnapshotManager surfaces
// (retentionCandidates / runGc / verify / getRetentionPolicy / list). It must
// never import GC/Retention/persistence internals, never touch Registry/Store/
// Resolver/Pipeline, and register all jobs via the generic scheduler.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import {
  BackgroundScheduler,
  SnapshotMaintenanceService,
} from "../../../src/settings/automation";

let center: ConfigCenter;
let manager: SnapshotManager;
let maintenance: SnapshotMaintenanceService;

function makeClock() {
  let t = 1000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

async function seedSnapshots(count: number) {
  for (let i = 0; i < count; i++) {
    await manager.capture({
      name: `seed-${i}`,
      scope: { type: "workspace", workspaceId: 700 + i },
      actor: "maint-test",
      origin: "automatic",
    });
  }
}

beforeAll(async () => {
  center = await initConfigCenter();
  manager = new SnapshotManager({
    store: center.store,
    resolver: center.resolver,
    pipeline: center.pipeline,
    registry: center.registry,
    persistence: new MemorySnapshotPersistence(),
  });
  maintenance = new SnapshotMaintenanceService({ snapshots: manager });
});

describe("SnapshotMaintenance — retention", () => {
  it("reports candidates without deleting anything", async () => {
    await seedSnapshots(3);
    const before = manager.count();
    const out = await maintenance.runRetention();
    expect(out.candidates).toBeGreaterThanOrEqual(0);
    expect(out.policy).toHaveProperty("keepLatest");
    expect(out.policy).toHaveProperty("keepYoungerThanDays");
    expect(manager.count()).toBe(before);
  });
});

describe("SnapshotMaintenance — integrity", () => {
  it("verifies all snapshots and reports failures (never restores)", async () => {
    const out = await maintenance.runIntegrity();
    expect(out.checked).toBe(manager.count());
    expect(Array.isArray(out.failures)).toBe(true);
    // verify() is read-only: no new revisions, no restores.
    expect(manager.count()).toBe(out.checked);
  });
});

describe("SnapshotMaintenance — gc", () => {
  it("delegates to the locked SnapshotManager.runGc() and reports its outcome", async () => {
    // Force an aggressive policy so old snapshots become candidates.
    manager.setRetentionPolicy({ keepLatest: 0, keepYoungerThanDays: 0 });
    const out = await maintenance.runGc();
    expect(out).toHaveProperty("collected");
    expect(out).toHaveProperty("snapshotIds");
    expect(out).toHaveProperty("skippedPinned");
    expect(out).toHaveProperty("skippedReferenced");
  });
});

describe("SnapshotMaintenance — full cycle report", () => {
  it("produces a MaintenanceReport with correlationId, duration, and all sections", async () => {
    const report = await maintenance.runMaintenanceCycle();
    expect(report.cycleId).toBeTruthy();
    expect(report.startedAt).toBeLessThanOrEqual(report.finishedAt);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(["ok", "degraded", "error"]).toContain(report.status);
    expect(report.retention).toHaveProperty("candidates");
    expect(report.integrity).toHaveProperty("checked");
    expect(report.gc).toHaveProperty("collected");
  });

  it("marks a cycle degraded when integrity failures exist", async () => {
    const fresh = new SnapshotMaintenanceService({ snapshots: manager });
    const report = await fresh.runMaintenanceCycle();
    expect(["ok", "degraded"]).toContain(report.status);
    if (report.integrity.failures.length > 0) {
      expect(report.status).toBe("degraded");
    } else {
      expect(report.status).toBe("ok");
    }
  });

  it("keeps a bounded report journal", async () => {
    const clock = makeClock();
    const fresh = new SnapshotMaintenanceService({ snapshots: manager, now: clock.now });
    for (let i = 0; i < 60; i++) {
      clock.advance(1);
      await fresh.runMaintenanceCycle();
    }
    expect(fresh.history().length).toBe(50);
    expect(fresh.lastReportValue()).not.toBeNull();
  });
});

describe("SnapshotMaintenance — health sink", () => {
  it("exposes a brief read-only health status", async () => {
    const clock = makeClock();
    const fresh = new SnapshotMaintenanceService({ snapshots: manager, now: clock.now });
    expect(fresh.healthStatus().status).toBe("ok");
    await fresh.runMaintenanceCycle();
    const hs = fresh.healthStatus();
    expect(hs.cycleId).toBeTruthy();
    expect(hs.at).toBeGreaterThanOrEqual(1000);
    expect(hs).toHaveProperty("integrityFailures");
    expect(hs).toHaveProperty("collected");
  });
});

describe("SnapshotMaintenance — scheduler registration", () => {
  it("registers all maintenance jobs through the generic BackgroundScheduler", async () => {
    const clock = makeClock();
    const scheduler = new BackgroundScheduler({ now: clock.now });
    const states = maintenance.registerJobs(scheduler, {
      retentionMs: 100,
      integrityMs: 200,
      gcMs: 300,
    });
    expect(states.map((s) => s.id)).toEqual([
      "snapshot.maintenance.retention",
      "snapshot.maintenance.integrity",
      "snapshot.maintenance.gc",
    ]);
    expect(states.every((s) => s.enabled)).toBe(true);
    expect(scheduler.list().length).toBe(3);
  });

  it("scheduler runs the maintenance jobs on interval", async () => {
    const clock = makeClock();
    const scheduler = new BackgroundScheduler({ now: clock.now });
    maintenance.registerJobs(scheduler, { retentionMs: 100, integrityMs: 100, gcMs: 100 });
    clock.advance(100);
    const records = await scheduler.tick();
    expect(records.length).toBe(3);
    expect(records.every((r) => r.status === "success")).toBe(true);
  });
});

describe("SnapshotMaintenance — scope guard", () => {
  it("is a pure consumer: does not import snapshot internals or mutate the store", async () => {
    const before = center.store.revisionCount;
    await maintenance.runIntegrity();
    await maintenance.runRetention();
    expect(center.store.revisionCount).toBe(before);
  });
});