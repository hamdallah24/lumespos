import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  RegistryLifecycle.reset();
  const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
  const { PipelineProfileRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineProfileRegistry");
  const { PipelineGraphRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineGraphRegistry");
  const { TriggerRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/TriggerRegistry");
  const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
  const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
  const { ExecutiveRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ExecutiveRegistry");
  const { EventRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/EventRegistry");
  const { RuntimeConfiguration } = await import("../../src/eios-runtime/internal/runtime-metadata/RuntimeConfiguration");
  const { FeatureFlagEngine } = await import("../../src/eios-runtime/internal/runtime-metadata/FeatureFlagEngine");
  PipelineStageRegistry.clear();
  PipelineProfileRegistry.clear();
  PipelineGraphRegistry.clear();
  TriggerRegistry.clear();
  ObserverRegistry.clear();
  CapabilityRegistry.clear();
  ExecutiveRegistry.clear();
  EventRegistry.clear();
  RuntimeConfiguration.clear();
  FeatureFlagEngine.clear();
});

describe("RegistryLifecycle", () => {
  it("should transition through valid states", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    expect(RegistryLifecycle.state).toBe("BOOT");
    RegistryLifecycle.transition("REGISTERING");
    expect(RegistryLifecycle.state).toBe("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    expect(RegistryLifecycle.state).toBe("VALIDATING");
    RegistryLifecycle.transition("FROZEN");
    expect(RegistryLifecycle.isFrozen()).toBe(true);
    RegistryLifecycle.transition("RUNNING");
    expect(RegistryLifecycle.isFrozen()).toBe(true);
  });

  it("should reject invalid transitions", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    expect(() => RegistryLifecycle.transition("FROZEN")).toThrow("Invalid");
  });

  it("should throw on mutation after FROZEN", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    RegistryLifecycle.transition("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    RegistryLifecycle.transition("FROZEN");
    expect(() => RegistryLifecycle.assertMutable()).toThrow("FROZEN");
  });
});

describe("PipelineStageRegistry", () => {
  it("should register and retrieve stages", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:stage:north_star@1.0.0");
    PipelineStageRegistry.register({
      id,
      manifest: { id, name: "North Star", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      execute: async () => ({ correlationId: "", stageId: id, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });

    expect(PipelineStageRegistry.get(id)).toBeDefined();
    expect(PipelineStageRegistry.getAll().length).toBe(1);
  });

  it("should reject duplicate registration", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:stage:test@1.0.0");
    const def = { id, manifest: { id, name: "Test", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} }, execute: async () => ({ correlationId: "", stageId: id, patches: {}, timestamp: "" }), timeout: 5000, retries: 2 };
    PipelineStageRegistry.register(def);
    expect(() => PipelineStageRegistry.register(def)).toThrow("already registered");
  });
});

describe("PipelineGraphRegistry", () => {
  it("should detect cycles", async () => {
    const { PipelineGraphRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineGraphRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const a = parseComponentId("eios.core:stage:a@1.0.0");
    const b = parseComponentId("eios.core:stage:b@1.0.0");
    const c = parseComponentId("eios.core:stage:c@1.0.0");

    PipelineGraphRegistry.addEdge(a, b);
    PipelineGraphRegistry.addEdge(b, c);
    PipelineGraphRegistry.addEdge(c, a);

    const result = PipelineGraphRegistry.validate();
    expect(result.cyclic).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
  });

  it("should return topological order", async () => {
    const { PipelineGraphRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineGraphRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");
    const { PipelineContext } = await import("../../src/eios-runtime/public/PipelineContext");

    const a = parseComponentId("eios.core:stage:a@1.0.0");
    const b = parseComponentId("eios.core:stage:b@1.0.0");

    PipelineGraphRegistry.addEdge(a, b);
    const ctx = new PipelineContext("test");
    const order = PipelineGraphRegistry.getExecutionOrder(ctx);
    expect(order.length).toBe(2);
    expect(order[0].name).toBe("a");
    expect(order[1].name).toBe("b");
  });
});

describe("TriggerRegistry", () => {
  it("should register and enable/disable triggers", async () => {
    const { TriggerRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/TriggerRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:trigger:event_bus@1.0.0");
    TriggerRegistry.register({ id, manifest: { id, name: "EventBus", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} }, description: "Event Bus trigger", intent: "business", enabled: true, priority: 100 });

    expect(TriggerRegistry.getByName("event_bus")).toBeDefined();
    expect(TriggerRegistry.getEnabled().length).toBe(1);
    TriggerRegistry.disable("event_bus");
    expect(TriggerRegistry.getEnabled().length).toBe(0);
  });
});

describe("ObserverRegistry", () => {
  it("should register and query observers by event", async () => {
    const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:observer:memory@1.0.0");
    ObserverRegistry.register({ id, manifest: { id, name: "Memory", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} }, subscribe: "decision.made", deliveryMode: "ExactlyOnce", priority: 100, handle: async () => {} });

    const observers = ObserverRegistry.getObserversForEvent("decision.made");
    expect(observers.length).toBe(1);
  });
});

describe("CapabilityRegistry", () => {
  it("should register and check capabilities", async () => {
    const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:capability:evaluate_score@1.0.0");
    CapabilityRegistry.register({ id, name: "evaluate_score", provider: id, priority: 1, cost: 10, latency: 50 });

    expect(CapabilityRegistry.has("evaluate_score")).toBe(true);
    expect(CapabilityRegistry.getByName("evaluate_score").length).toBe(1);
  });
});

describe("RuntimeConfiguration", () => {
  it("should respect layer priority", async () => {
    const { RuntimeConfiguration } = await import("../../src/eios-runtime/internal/runtime-metadata/RuntimeConfiguration");

    RuntimeConfiguration.set("timeout", 30000, "system");
    RuntimeConfiguration.set("timeout", 15000, "branch");
    expect(RuntimeConfiguration.get("timeout")).toBe(15000);

    RuntimeConfiguration.set("timeout", 5000, "system");
    expect(RuntimeConfiguration.get("timeout")).toBe(15000);
  });
});

describe("FeatureFlagEngine", () => {
  it("should respect rollout percentage", async () => {
    const { FeatureFlagEngine } = await import("../../src/eios-runtime/internal/runtime-metadata/FeatureFlagEngine");

    FeatureFlagEngine.set("digital_twin", true, 50);
    expect(FeatureFlagEngine.isEnabled("digital_twin", { percentage: 25 })).toBe(true);
    expect(FeatureFlagEngine.isEnabled("digital_twin", { percentage: 75 })).toBe(false);
  });
});

describe("ExecutiveRegistry", () => {
  it("should register and find by role", async () => {
    const { ExecutiveRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ExecutiveRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id = parseComponentId("eios.core:executive:CEO@1.0.0");
    ExecutiveRegistry.register({ id, manifest: { id, name: "CEO", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} }, role: "CEO", capabilities: ["delegate", "approve"], priority: 1, authority: "full", councilMember: true });

    expect(ExecutiveRegistry.getByRole("CEO")).toBeDefined();
    expect(ExecutiveRegistry.getByCapability("delegate").length).toBe(1);
  });
});
