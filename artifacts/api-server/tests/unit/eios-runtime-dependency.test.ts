import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  RegistryLifecycle.reset();
  const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
  const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
  const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
  const { ExecutiveRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ExecutiveRegistry");
  const { EventRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/EventRegistry");
  const { DependencyResolver } = await import("../../src/eios-runtime/internal/DependencyResolver");
  PipelineStageRegistry.clear();
  ObserverRegistry.clear();
  CapabilityRegistry.clear();
  ExecutiveRegistry.clear();
  EventRegistry.clear();
  DependencyResolver.clear();
});

describe("CapabilityPriority", () => {
  it("should select best by priority and cost", async () => {
    const { CapabilityPriority } = await import("../../src/eios-runtime/internal/runtime-capability/CapabilityPriority");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const a = { id: parseComponentId("eios.core:capability:evaluate@1.0.0"), name: "evaluate", provider: parseComponentId("eios.core:stage:a@1.0.0"), priority: 1, cost: 100, latency: 50 };
    const b = { id: parseComponentId("eios.core:capability:evaluate@2.0.0"), name: "evaluate", provider: parseComponentId("eios.core:stage:b@1.0.0"), priority: 2, cost: 50, latency: 50 };

    const best = CapabilityPriority.selectBest([a, b]);
    expect(best.id.version.major).toBe(1);
  });
});

describe("CapabilityResolver", () => {
  it("should resolve with constraints", async () => {
    const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
    const { CapabilityResolver } = await import("../../src/eios-runtime/internal/runtime-capability/CapabilityResolver");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const id1 = parseComponentId("eios.core:capability:evaluate@1.0.0");
    const id2 = parseComponentId("eios.core:capability:evaluate@2.0.0");
    const provider = parseComponentId("eios.core:stage:provider@1.0.0");

    CapabilityRegistry.register({ id: id1, name: "evaluate", provider, priority: 1, cost: 100, latency: 50 });
    CapabilityRegistry.register({ id: id2, name: "evaluate", provider, priority: 2, cost: 50, latency: 30 });

    const resolved = CapabilityResolver.resolve("evaluate", { maxCost: 80 });
    expect(resolved).toBeDefined();
    expect(resolved!.id.version.major).toBe(2);
    expect(resolved!.cost).toBe(50);
  });
});

describe("CapabilityNegotiator", () => {
  it("should negotiate best provider", async () => {
    const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
    const { CapabilityNegotiator } = await import("../../src/eios-runtime/internal/runtime-capability/CapabilityNegotiator");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const provider = parseComponentId("eios.core:stage:p@1.0.0");
    CapabilityRegistry.register({ id: parseComponentId("eios.core:capability:analyze@1.0.0"), name: "analyze", provider, priority: 1, cost: 100, latency: 50 });
    CapabilityRegistry.register({ id: parseComponentId("eios.core:capability:analyze@2.0.0"), name: "analyze", provider, priority: 2, cost: 30, latency: 20 });

    const result = CapabilityNegotiator.negotiateAll();
    expect(result.has("analyze")).toBe(true);
    expect(result.get("analyze")!.priority).toBe(1);
  });
});

describe("DependencyResolver", () => {
  it("should detect stage dependency cycles", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { DependencyResolver } = await import("../../src/eios-runtime/internal/DependencyResolver");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const idA = parseComponentId("eios.core:stage:a@1.0.0");
    const idB = parseComponentId("eios.core:stage:b@1.0.0");

    PipelineStageRegistry.register({
      id: idA, manifest: {
        id: idA, name: "A", description: "", dependencies: [idB], capabilities: [], tags: [],
        checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: idA, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });
    PipelineStageRegistry.register({
      id: idB, manifest: {
        id: idB, name: "B", description: "", dependencies: [idA], capabilities: [], tags: [],
        checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: idB, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });

    const result = DependencyResolver.resolveAll();
    expect(result.success).toBe(false);
    expect(result.cycles.length).toBeGreaterThan(0);
  });

  it("should resolve acyclic dependencies successfully", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { DependencyResolver } = await import("../../src/eios-runtime/internal/DependencyResolver");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const idA = parseComponentId("eios.core:stage:a@1.0.0");
    const idB = parseComponentId("eios.core:stage:b@1.0.0");

    PipelineStageRegistry.register({
      id: idA, manifest: {
        id: idA, name: "A", description: "", dependencies: [], capabilities: [], tags: [],
        checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: idA, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });
    PipelineStageRegistry.register({
      id: idB, manifest: {
        id: idB, name: "B", description: "", dependencies: [idA], capabilities: [], tags: [],
        checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: idB, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });

    const result = DependencyResolver.resolveAll();
    expect(result.success).toBe(true);
  });

  it("should build construction graph", async () => {
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { DependencyResolver } = await import("../../src/eios-runtime/internal/DependencyResolver");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const idA = parseComponentId("eios.core:stage:a@1.0.0");
    const idB = parseComponentId("eios.core:stage:b@1.0.0");

    PipelineStageRegistry.register({
      id: idA, manifest: { id: idA, name: "A", description: "", dependencies: [], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      execute: async () => ({ correlationId: "", stageId: idA, patches: {}, timestamp: "" }), timeout: 5000, retries: 2,
    });
    PipelineStageRegistry.register({
      id: idB, manifest: { id: idB, name: "B", description: "", dependencies: [idA], capabilities: [], tags: [], checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 }, deprecated: false, replacement: null, metadata: {} },
      execute: async () => ({ correlationId: "", stageId: idB, patches: {}, timestamp: "" }), timeout: 5000, retries: 2,
    });

    DependencyResolver.resolveAll();
    const graph = DependencyResolver.buildConstructionGraph();
    expect(graph.length).toBeGreaterThanOrEqual(2);
  });
});
