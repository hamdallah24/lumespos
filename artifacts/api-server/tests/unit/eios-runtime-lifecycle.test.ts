import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RuntimeState } = await import("../../src/eios-runtime/internal/RuntimeState");
  const { RuntimeHealth } = await import("../../src/eios-runtime/internal/RuntimeHealth");
  const { RuntimeSnapshotManager } = await import("../../src/eios-runtime/internal/RuntimeSnapshotManager");
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  RuntimeState.reset();
  RuntimeHealth.clear();
  RuntimeSnapshotManager.clear();
  RegistryLifecycle.reset();
});

describe("RuntimeState", () => {
  it("should track lifecycle states", async () => {
    const { RuntimeState } = await import("../../src/eios-runtime/internal/RuntimeState");
    expect(RuntimeState.get()).toBe("stopped");
    RuntimeState.start();
    expect(RuntimeState.isRunning()).toBe(true);
    expect(RuntimeState.getUptimeMs()).toBeGreaterThanOrEqual(0);
    RuntimeState.pause();
    expect(RuntimeState.isRunning()).toBe(false);
    RuntimeState.resume();
    expect(RuntimeState.isRunning()).toBe(true);
    RuntimeState.stop();
    expect(RuntimeState.isRunning()).toBe(false);
  });
});

describe("RuntimeHealth", () => {
  it("should record time-series health data", async () => {
    const { RuntimeHealth } = await import("../../src/eios-runtime/internal/RuntimeHealth");
    RuntimeHealth.record();
    RuntimeHealth.record();

    const history = RuntimeHealth.getHistory();
    expect(history.length).toBe(2);

    const trend = RuntimeHealth.getTrend();
    expect(["improving", "declining", "stable"]).toContain(trend);
  });
});

describe("RuntimeFreezeManager", () => {
  it("should freeze and unfreeze registries", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    const { RuntimeFreezeManager } = await import("../../src/eios-runtime/internal/RuntimeFreezeManager");
    RegistryLifecycle.transition("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    RuntimeFreezeManager.freezeAll();
    expect(RegistryLifecycle.isFrozen()).toBe(true);
    RuntimeFreezeManager.unfreezeAll();
    expect(RegistryLifecycle.isFrozen()).toBe(false);
  });
});

describe("RuntimeSnapshotManager", () => {
  it("should create and restore snapshots", async () => {
    const { RuntimeSnapshotManager } = await import("../../src/eios-runtime/internal/RuntimeSnapshotManager");

    RuntimeSnapshotManager.recordEvent("test.event", { value: 1 });
    const id = RuntimeSnapshotManager.createSnapshot("test");

    RuntimeSnapshotManager.recordEvent("after.event", { value: 2 });

    const restored = RuntimeSnapshotManager.restoreSnapshot(id);
    expect(restored).toBe(true);
    expect(RuntimeSnapshotManager.getEventLog().length).toBe(1);
  });

  it("should diff snapshots", async () => {
    const { RuntimeSnapshotManager } = await import("../../src/eios-runtime/internal/RuntimeSnapshotManager");

    RuntimeSnapshotManager.recordEvent("event.a", {});
    const idA = RuntimeSnapshotManager.createSnapshot("a");

    RuntimeSnapshotManager.recordEvent("event.b", {});
    const idB = RuntimeSnapshotManager.createSnapshot("b");

    const diff = RuntimeSnapshotManager.diffSnapshots(idA, idB);
    expect(diff.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Bootstrap", () => {
  it("should bootstrap and start runtime", async () => {
    const { bootstrapRuntime } = await import("../../src/eios-runtime/internal/Bootstrap");
    const { RuntimeState } = await import("../../src/eios-runtime/internal/RuntimeState");
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");

    await bootstrapRuntime();
    expect(RuntimeState.isRunning()).toBe(true);
    expect(RegistryLifecycle.isFrozen()).toBe(true);
  });
});
