import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
  RegistryLifecycle.reset();
  const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
  const { PipelineProfileRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineProfileRegistry");
  const { PipelineGraphRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineGraphRegistry");
  const { PipelineAudit } = await import("../../src/eios-runtime/internal/PipelineAudit");
  const { PipelineMetrics } = await import("../../src/eios-runtime/internal/PipelineMetrics");
  PipelineStageRegistry.clear();
  PipelineProfileRegistry.clear();
  PipelineGraphRegistry.clear();
  PipelineAudit.clear();
  PipelineMetrics.clear();
});

describe("PipelineAudit", () => {
  it("should record and retrieve audit entries", async () => {
    const { PipelineAudit } = await import("../../src/eios-runtime/internal/PipelineAudit");
    PipelineAudit.record({ stageId: "test:stage:a@1.0.0", status: "completed", durationMs: 100 });
    PipelineAudit.record({ stageId: "test:stage:b@1.0.0", status: "failed", durationMs: 50, error: "error" });

    const log = PipelineAudit.getLog();
    expect(log.length).toBe(2);

    const failures = PipelineAudit.getFailures();
    expect(failures.length).toBe(1);
    expect(failures[0].stageId).toContain("b");
  });
});

describe("PipelineMetrics", () => {
  it("should record and compute metrics", async () => {
    const { PipelineMetrics } = await import("../../src/eios-runtime/internal/PipelineMetrics");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    PipelineMetrics.recordStage("eios.core:stage:a@1.0.0", 100, true);
    PipelineMetrics.recordStage("eios.core:stage:b@1.0.0", 200, false);

    PipelineMetrics.recordExecution({
      success: true, trigger: "manual", durationMs: 300,
      stages: [parseComponentId("eios.core:stage:a@1.0.0")],
    });

    const metrics = PipelineMetrics.getMetrics();
    expect(metrics.totalExecutions).toBe(1);
    expect(metrics.stageHistoryCount).toBe(2);
  });
});

describe("PipelineEngine", () => {
  it("should not execute before FROZEN", async () => {
    const { PipelineEngine } = await import("../../src/eios-runtime/internal/PipelineEngine");
    const { PipelineContext } = await import("../../src/eios-runtime/public/PipelineContext");

    const ctx = new PipelineContext("test");
    await expect(PipelineEngine.execute("test", ctx)).rejects.toThrow("FROZEN");
  });

  it("should execute stages in order", async () => {
    const { RegistryLifecycle } = await import("../../src/eios-runtime/internal/runtime-metadata/RegistryLifecycle");
    const { PipelineStageRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineStageRegistry");
    const { PipelineProfileRegistry } = await import("../../src/eios-runtime/internal/runtime-metadata/PipelineProfileRegistry");
    const { PipelineEngine } = await import("../../src/eios-runtime/internal/PipelineEngine");
    const { PipelineContext } = await import("../../src/eios-runtime/public/PipelineContext");
    const { parseComponentId } = await import("../../src/eios-runtime/contracts/ComponentId");

    const idA = parseComponentId("eios.core:stage:a@1.0.0");
    const idB = parseComponentId("eios.core:stage:b@1.0.0");

    PipelineStageRegistry.register({
      id: idA, manifest: {
        id: idA, name: "A", description: "", dependencies: [],
        capabilities: [], tags: [], checksum: "c1",
        schemaVersion: { major: 1, minor: 0, patch: 0 },
        deprecated: false, replacement: null, metadata: {},
      },
      execute: async (ctx) => {
        const count = (ctx.read<number>("count") || 0) + 1;
        return { correlationId: ctx.correlationId, stageId: idA, patches: { count }, timestamp: "" };
      },
      timeout: 5000, retries: 2,
    });

    PipelineStageRegistry.register({
      id: idB, manifest: {
        id: idB, name: "B", description: "", dependencies: [idA],
        capabilities: [], tags: [], checksum: "c2",
        schemaVersion: { major: 1, minor: 0, patch: 0 },
        deprecated: false, replacement: null, metadata: {},
      },
      execute: async (ctx) => {
        const count = (ctx.read<number>("count") || 0) + 1;
        return { correlationId: ctx.correlationId, stageId: idB, patches: { count }, timestamp: "" };
      },
      timeout: 5000, retries: 2,
    });

    PipelineProfileRegistry.register({
      id: parseComponentId("eios.core:profile:test@1.0.0"),
      manifest: {
        id: parseComponentId("eios.core:profile:test@1.0.0"), name: "Test", description: "",
        dependencies: [], capabilities: [], tags: [],
        checksum: "c", schemaVersion: { major: 1, minor: 0, patch: 0 },
        deprecated: false, replacement: null, metadata: {},
      },
      intents: ["test"],
      tags: ["test"],
    });

    RegistryLifecycle.transition("REGISTERING");
    RegistryLifecycle.transition("VALIDATING");
    RegistryLifecycle.transition("FROZEN");

    const ctx = new PipelineContext("pipeline-test");
    const result = await PipelineEngine.execute("test", ctx);

    expect(result.success).toBe(true);
    expect(result.stages.length).toBeGreaterThanOrEqual(2);
  });
});
