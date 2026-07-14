import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  RegistryLifecycle.reset();
  const { TriggerRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/TriggerRegistry");
  const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
  const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
  const { PipelineProfileRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineProfileRegistry");
  const { PipelineGraphRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineGraphRegistry");
  const { PipelineAudit } = await import("../../src/eios-runtime/internal/PipelineAudit");
  const { PipelineMetrics } = await import("../../src/eios-runtime/internal/PipelineMetrics");
  TriggerRegistry.clear();
  ObserverRegistry.clear();
  PipelineStageRegistry.clear();
  PipelineProfileRegistry.clear();
  PipelineGraphRegistry.clear();
  PipelineAudit.clear();
  PipelineMetrics.clear();
});

describe("ObserverEngine", () => {
  it("should dispatch FireAndForget observers", async () => {
    const { ObserverEngine } = await import("../../src/eios-runtime/public/ObserverEngine");
    const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    let handled = false;
    const promise = new Promise<void>(resolve => {
      ObserverRegistry.register({
        id: parseComponentId("eios.core:observer:test@1.0.0"),
        manifest: { id: parseComponentId("eios.core:observer:test@1.0.0"), name: "Test", description: "", dependencies: [], capabilities: [], tags: [], checksum: "c", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
        subscribe: "test.event",
        deliveryMode: "FireAndForget",
        priority: 100,
        handle: async () => { handled = true; resolve(); },
      });
    });

    await ObserverEngine.dispatch({
      id: "e1", correlationId: "c1",
      type: { namespace: "eios", type: "event", name: "test.event", version: { major: 1, minor: 0, patch: 0 } },
      payload: {}, timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });

    await promise;
    expect(handled).toBe(true);
  });

  it("should move failed ExactlyOnce to DLQ", async () => {
    const { ObserverEngine } = await import("../../src/eios-runtime/public/ObserverEngine");
    const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    let attempts = 0;
    ObserverRegistry.register({
      id: parseComponentId("eios.core:observer:fail@1.0.0"),
      manifest: { id: parseComponentId("eios.core:observer:fail@1.0.0"), name: "Fail", description: "", dependencies: [], capabilities: [], tags: [], checksum: "c", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      subscribe: "fail.event",
      deliveryMode: "ExactlyOnce",
      priority: 100,
      handle: async () => { attempts++; throw new Error("fail"); },
    });

    await ObserverEngine.dispatch({
      id: "e2", correlationId: "c2",
      type: { namespace: "eios", type: "event", name: "fail.event", version: { major: 1, minor: 0, patch: 0 } },
      payload: {}, timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });

    const dlq = ObserverEngine.getDeadLetterQueue();
    expect(dlq.length).toBe(1);
    expect(dlq[0].observerId).toContain("fail");
  });
});

describe("TriggerEngine", () => {
  it("should not fire when registry not FROZEN", async () => {
    const { TriggerEngine } = await import("../../src/eios-runtime/public/TriggerEngine");
    const result = await TriggerEngine.fire("test");
    expect(result).toBeNull();
  });

  it("should list registered triggers", async () => {
    const { TriggerEngine } = await import("../../src/eios-runtime/public/TriggerEngine");
    const { TriggerRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/TriggerRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    TriggerRegistry.register({
      id: parseComponentId("eios.core:trigger:t1@1.0.0"),
      manifest: { id: parseComponentId("eios.core:trigger:t1@1.0.0"), name: "T1", description: "", dependencies: [], capabilities: [], tags: [], checksum: "c", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      description: "Test trigger", intent: "business", enabled: true, priority: 100,
    });

    const names = TriggerEngine.getRegisteredTriggers();
    expect(names).toContain("t1");
  });
});

describe("PipelineResolver", () => {
  it("should resolve intent to profile", async () => {
    const { PipelineResolver } = await import("../../src/eios-runtime/public/PipelineResolver");
    const { PipelineContext } = await import("../../src/eios-runtime/public/PipelineContext");

    const ctx = new PipelineContext("test");
    const profile = PipelineResolver.resolve("business_operation", ctx);
    expect(profile).toBe("business");
  });
});
