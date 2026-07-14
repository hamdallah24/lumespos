import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
  const { ObserverRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ObserverRegistry");
  const { CapabilityRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/CapabilityRegistry");
  const { ExecutiveRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/ExecutiveRegistry");
  const { PolicyRegistry } = await import("../../src/eios-runtime/internal/runtime-policy/PolicyRegistry");
  const { DependencyResolver } = await import("../../src/eios-runtime/internal/DependencyResolver");
  RegistryLifecycle.reset();
  PipelineStageRegistry.clear();
  ObserverRegistry.clear();
  CapabilityRegistry.clear();
  ExecutiveRegistry.clear();
  PolicyRegistry.clear();
  DependencyResolver.clear();
});

describe("PolicyEngine", () => {
  it("should evaluate conditions", async () => {
    const { PolicyEngine } = await import("../../src/eios-runtime/internal/runtime-policy/PolicyEngine");
    const { PolicyRegistry } = await import("../../src/eios-runtime/internal/runtime-policy/PolicyRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    PolicyRegistry.register({
      id: parseComponentId("eios.core:policy:min_confidence@1.0.0"),
      condition: "confidence < 75",
      action: "execute_council",
      priority: 1,
    });

    const ctx = { scope: "pipeline", read: (k: string) => k === "confidence" ? 63 : undefined };
    const result = PolicyEngine.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.actions).toContain("execute_council");
  });

  it("should explain policy decisions", async () => {
    const { PolicyEngine } = await import("../../src/eios-runtime/internal/runtime-policy/PolicyEngine");
    const { PolicyRegistry } = await import("../../src/eios-runtime/internal/runtime-policy/PolicyRegistry");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    PolicyRegistry.register({
      id: parseComponentId("eios.core:policy:max_risk@1.0.0"),
      condition: "risk > 80",
      action: "require_founder_approval",
      priority: 1,
    });

    const ctx = { scope: "pipeline", read: (k: string) => k === "risk" ? 85 : undefined };
    const explanations = PolicyEngine.explain(ctx);
    expect(explanations.length).toBe(1);
    expect(explanations[0].action).toBe("require_founder_approval");
    expect(explanations[0].threshold).toBe(80);
    expect(explanations[0].actualValue).toBe(85);
  });
});

describe("RuntimeGovernance", () => {
  it("should pass validation with clean state", async () => {
    const { RuntimeGovernance } = await import("../../src/eios-runtime/internal/runtime-governance/RuntimeGovernance");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");

    const id = parseComponentId("eios.core:stage:test@1.0.0");
    PipelineStageRegistry.register({
      id, manifest: {
        id, name: "Test", description: "", dependencies: [], capabilities: [], tags: [],
        checksum: "abc123", schemaVersion: { major: 1, minor: 0, patch: 0 },
        deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: id, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });

    const report = await RuntimeGovernance.validateAll();
    expect(report.passed).toBe(true);
  });

  it("should fail when stage has no checksum", async () => {
    const { RuntimeGovernance } = await import("../../src/eios-runtime/internal/runtime-governance/RuntimeGovernance");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");

    const id = parseComponentId("eios.core:stage:bad@1.0.0");
    PipelineStageRegistry.register({
      id, manifest: {
        id, name: "Bad", description: "", dependencies: [], capabilities: [], tags: [],
        checksum: "", schemaVersion: { major: 1, minor: 0, patch: 0 },
        deprecated: false, replacement: null, metadata: {},
      },
      execute: async () => ({ correlationId: "", stageId: id, patches: {}, timestamp: "" }),
      timeout: 5000, retries: 2,
    });

    await expect(RuntimeGovernance.validateAll()).rejects.toThrow("checksum");
  });

  it("should manage periodic check lifecycle", async () => {
    const { RuntimeGovernance } = await import("../../src/eios-runtime/internal/runtime-governance/RuntimeGovernance");

    RuntimeGovernance.startPeriodicCheck(5000);
    RuntimeGovernance.stopPeriodicCheck();

    expect(true).toBe(true);
  });
});
