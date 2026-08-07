// ConfigCenter — Milestone 4 Phase 3: Drift Detection tests.
// The DriftDetector compares the latest snapshot baseline (expected) against the
// Resolver's current effective output (actual) via the SDK, and classifies the
// delta NONE / WARNING / CRITICAL. It must be READ-ONLY: no Store write, no
// pipeline invocation, no restore — and it reads Resolver only through the SDK.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import { BackgroundScheduler, DriftDetector } from "../../../src/settings/automation";

let center: ConfigCenter;
let manager: SnapshotManager;
let drift: DriftDetector;

function makeClock() {
  let t = 1000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
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
  drift = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry });
});

describe("DriftDetector — no baseline", () => {
  it("reports NONE with present:false when no baseline snapshot exists", async () => {
    const report = await drift.detect();
    expect(report.severity).toBe("NONE");
    expect(report.baseline.present).toBe(false);
    expect(report.changes).toEqual([]);
    expect(report.affectedKeys).toEqual([]);
  });
});

describe("DriftDetector — baseline vs current", () => {
  it("reports NONE when current matches the baseline snapshot", async () => {
    const snap = await manager.capture({
      name: "baseline-ok",
      scope: { type: "default" },
      actor: "drift-test",
      origin: "automatic",
    });
    // Capture payload equals the effective state; no override yet → no drift.
    const report = await drift.detect();
    expect(report.baseline.present).toBe(true);
    expect(report.baseline.snapshotId).toBe(snap.id);
    expect(report.severity).toBe("NONE");
    expect(report.cycleId).toBeTruthy();
    expect(report.detectedAt).toBeGreaterThan(0);
  });

  it("reports WARNING for non-critical changes and lists them", async () => {
    const before = await manager.capture({
      name: "baseline-warning",
      scope: { type: "default" },
      actor: "drift-test",
      origin: "automatic",
    });
    // Commit a low-criticality change after the baseline.
    const lowKey = center.registry.list().find((f) => (f.criticality ?? "low") === "low")!;
    await center.pipeline.run({
      actor: { actorId: "drift-test", role: "owner", branchId: null, workspaceId: null },
      scope: { type: "default" },
      changes: { [lowKey.key]: "drifted" },
    });
    const report = await drift.detect();
    expect(report.baseline.snapshotId).toBe(before.id);
    expect(report.severity).toBe("WARNING");
    expect(report.affectedKeys.length).toBeGreaterThan(0);
    const entry = report.changes.find((c) => c.key === lowKey.key);
    expect(entry).toBeDefined();
    expect(entry!.changed).toBe(true);
  });

  it("reports CRITICAL when a high/critical key changed", async () => {
    const criticalKey = center.registry.list().find((f) => f.key === "providers.deepseek.model");
    expect(criticalKey).toBeDefined();
    await center.pipeline.run({
      actor: { actorId: "drift-test", role: "owner", branchId: null, workspaceId: null },
      scope: { type: "default" },
      changes: { [criticalKey!.key]: "deepseek-v4-flash" },
    });
    const report = await drift.detect();
    expect(report.severity).toBe("CRITICAL");
    expect(report.affectedKeys).toContain(criticalKey!.key);
    expect(report.recommendation).toContain("immediate");
  });
});

describe("DriftDetector — history + status", () => {
  it("keeps bounded history and last status", async () => {
    const clock = makeClock();
    const fresh = new DriftDetector({ snapshots: manager, resolver: center.sdk, registry: center.registry, now: clock.now });
    for (let i = 0; i < 60; i++) {
      clock.advance(1);
      await fresh.detect();
    }
    expect(fresh.reportHistory().length).toBe(50);
    expect(fresh.status()).not.toBeNull();
    expect(fresh.status()!.cycleId).toBeTruthy();
  });
});

describe("DriftDetector — scheduler registration", () => {
  it("registers exactly one job on the generic scheduler", async () => {
    const clock = makeClock();
    const scheduler = new BackgroundScheduler({ now: clock.now });
    const state = drift.registerJob(scheduler, 100);
    expect(state.id).toBe("config.drift.detection");
    expect(state.enabled).toBe(true);
    expect(scheduler.list().length).toBe(1);
    clock.advance(100);
    const records = await scheduler.tick();
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("success");
  });
});

describe("DriftDetector — scope guard", () => {
  it("is read-only: store revision unchanged across a detection run", async () => {
    const before = center.store.revisionCount;
    await drift.detect();
    expect(center.store.revisionCount).toBe(before);
  });
});