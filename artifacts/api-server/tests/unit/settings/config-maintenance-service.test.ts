// ConfigCenter — Milestone 4 Phase 4: Background Maintenance Service tests.
// The orchestrator composes retention → integrity → gc → drift → health → report
// into ONE cycle, registered as ONE job on the generic scheduler. It is an
// additive consumer (uses SnapshotMaintenance + DriftDetector + a health
// reporter) and never mutates Configuration Center.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import {
  BackgroundScheduler,
  BackgroundMaintenanceService,
  SnapshotMaintenanceService,
  DriftDetector,
} from "../../../src/settings/automation";

let center: ConfigCenter;
let manager: SnapshotManager;
let service: BackgroundMaintenanceService;

function makeClock() {
  let t = 1000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

function buildService(clock?: ReturnType<typeof makeClock>) {
  const maintenance = new SnapshotMaintenanceService({ snapshots: manager, now: clock?.now });
  const drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry, now: clock?.now });
  const health = {
    report: async () => ({ status: "ok" }),
  };
  return new BackgroundMaintenanceService({ maintenance, drift, health, now: clock?.now });
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
  service = buildService();
});

describe("BackgroundMaintenanceService — cycle", () => {
  it("runs a full cycle producing one report with all six steps", async () => {
    const clock = makeClock();
    const s = buildService(clock);
    const cycle = await s.runCycle();
    expect(cycle.cycleId).toBeTruthy();
    expect(cycle.durationMs).toBeGreaterThanOrEqual(0);
    expect(["ok", "degraded", "error"]).toContain(cycle.status);
    const names = cycle.steps.map((st) => st.name);
    expect(names).toEqual(["retention", "integrity", "gc", "drift", "health"]);
    expect(cycle.retention).not.toBeNull();
    expect(cycle.integrity).not.toBeNull();
    expect(cycle.gc).not.toBeNull();
    expect(cycle.drift).not.toBeNull();
    expect(cycle.health).not.toBeNull();
  });

  it("isolates step failures without aborting the cycle", async () => {
    const maintenance = new SnapshotMaintenanceService({ snapshots: manager });
    const drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry });
    const breaking = {
      report: async () => {
        throw new Error("probe failed");
      },
    };
    const s = new BackgroundMaintenanceService({ maintenance, drift, health: breaking });
    const cycle = await s.runCycle();
    const healthStep = cycle.steps.find((st) => st.name === "health")!;
    expect(healthStep.status).toBe("error");
    expect(healthStep.detail).toBe("probe failed");
    expect(cycle.status).toBe("error");
    // Earlier steps still completed.
    expect(cycle.retention).not.toBeNull();
    expect(cycle.steps).toHaveLength(5);
  });

  it("rejects a second cycle while one is running", async () => {
    const maintenance = new SnapshotMaintenanceService({ snapshots: manager });
    const drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry });
    const slowHealth = {
      report: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { status: "ok" };
      },
    };
    const s = new BackgroundMaintenanceService({ maintenance, drift, health: slowHealth });
    const first = s.runCycle();
    await expect(s.runCycle()).rejects.toThrow(/already running/);
    await first;
    expect(s.isRunning()).toBe(false);
  });
});

describe("BackgroundMaintenanceService — operational metrics", () => {
  it("tracks total cycles, success count, and averages", async () => {
    const clock = makeClock();
    const s = buildService(clock);
    for (let i = 0; i < 3; i++) {
      clock.advance(10);
      await s.runCycle();
    }
    const m = s.metrics();
    expect(m.totalCycles).toBe(3);
    expect(m.successCount).toBe(3);
    expect(m.failureCount).toBe(0);
    expect(m.avgDurationMs).toBeGreaterThanOrEqual(0);
    expect(m.lastCycleAt).not.toBeNull();
  });

  it("counts degraded periods", async () => {
    const clock = makeClock();
    const maintenance = new SnapshotMaintenanceService({ snapshots: manager, now: clock.now });
    // Force a degraded cycle by reporting health as error.
    const drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry });
    const health = { report: async () => ({ status: "error" }) };
    const s = new BackgroundMaintenanceService({ maintenance, drift, health, now: clock.now });
    await s.runCycle();
    expect(s.metrics().degradedPeriods).toBe(1);
  });
});

describe("BackgroundMaintenanceService — status view", () => {
  it("reports running state, current step, last success/failure", async () => {
    const clock = makeClock();
    const s = buildService(clock);
    await s.runCycle();
    const view = s.status();
    expect(view.running).toBe(false);
    expect(view.metrics.totalCycles).toBe(1);
    expect(view.latestCycle).not.toBeNull();
    expect(view.lastSuccessfulCycle).not.toBeNull();
  });
});

describe("BackgroundMaintenanceService — one scheduler job", () => {
  it("registers a single job via the generic scheduler and runs it on interval", async () => {
    const clock = makeClock();
    const scheduler = new BackgroundScheduler({ now: clock.now });
    const maintenance = new SnapshotMaintenanceService({ snapshots: manager, now: clock.now });
    const drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry, now: clock.now });
    const health = { report: async () => ({ status: "ok" }) };
    const s = new BackgroundMaintenanceService({ maintenance, drift, health, now: clock.now });
    const state = s.registerJob(scheduler, 50);
    expect(state.id).toBe("config.maintenance.cycle");
    expect(scheduler.list().length).toBe(1);
    clock.advance(50);
    const records = await scheduler.tick();
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("success");
    expect(s.metrics().totalCycles).toBe(1);
  });
});

describe("BackgroundMaintenanceService — scope guard", () => {
  it("is read-only for the store across a cycle", async () => {
    const before = center.store.revisionCount;
    await service.runCycle();
    expect(center.store.revisionCount).toBe(before);
  });

  it("keeps a journal (audit entry per cycle), bounded", async () => {
    const clock = makeClock();
    const s = buildService(clock);
    for (let i = 0; i < 110; i++) {
      clock.advance(1);
      await s.runCycle();
    }
    expect(s.cycleHistory().length).toBe(100);
  });
});