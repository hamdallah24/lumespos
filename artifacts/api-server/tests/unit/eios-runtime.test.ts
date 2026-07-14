import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { clearStages } = await import("../../src/eios-runtime/PipelineRegistry");
  const { clearAuditLog } = await import("../../src/eios-runtime/PipelineAudit");
  const { clearMetrics } = await import("../../src/eios-runtime/PipelineMetrics");
  const { clearAllSchedules } = await import("../../src/eios-runtime/PipelineScheduler");
  const { RuntimeState } = await import("../../src/eios-runtime/RuntimeState");
  clearStages();
  clearAuditLog();
  clearMetrics();
  clearAllSchedules();
  RuntimeState.reset();
});

describe("RuntimeState", () => {
  it("should track lifecycle", async () => {
    const { RuntimeState } = await import("../../src/eios-runtime/RuntimeState");
    expect(RuntimeState.get()).toBe("stopped");
    RuntimeState.start();
    expect(RuntimeState.isRunning()).toBe(true);
    RuntimeState.pause();
    expect(RuntimeState.isRunning()).toBe(false);
    RuntimeState.resume();
    expect(RuntimeState.isRunning()).toBe(true);
    RuntimeState.stop();
    expect(RuntimeState.isRunning()).toBe(false);
  });
});

describe("PipelineContext", () => {
  it("should create a context with correlationId", async () => {
    const { createPipelineContext } = await import("../../src/eios-runtime/PipelineContext");
    const ctx = createPipelineContext("manual", 1);
    expect(ctx.correlationId).toBeTruthy();
    expect(ctx.traceId).toBeTruthy();
    expect(ctx.sourceTrigger).toBe("manual");
    expect(ctx.branchId).toBe(1);
    expect(ctx.status).toBe("running");
  });

  it("should complete and fail context", async () => {
    const { createPipelineContext, completeContext, failContext, cancelContext } = await import("../../src/eios-runtime/PipelineContext");
    const ctx = createPipelineContext("scheduler");
    completeContext(ctx);
    expect(ctx.status).toBe("completed");
    expect(ctx.completedAt).toBeTruthy();

    const ctx2 = createPipelineContext("founder");
    failContext(ctx2);
    expect(ctx2.status).toBe("failed");

    const ctx3 = createPipelineContext("manual");
    cancelContext(ctx3);
    expect(ctx3.status).toBe("cancelled");
  });
});

describe("PipelineRegistry", () => {
  it("should register and retrieve stages", async () => {
    const { registerStage, getStageHandler, getAllStages, clearStages } = await import("../../src/eios-runtime/PipelineRegistry");

    registerStage("business_intelligence", async () => ({ facts: [] }));
    const handler = getStageHandler("business_intelligence");
    expect(handler).toBeDefined();

    clearStages();
    expect(getAllStages().length).toBe(0);
  });
});

describe("PipelineAudit", () => {
  it("should record and retrieve audit entries", async () => {
    const { recordAuditEntry, getAuditLog } = await import("../../src/eios-runtime/PipelineAudit");

    recordAuditEntry({
      correlationId: "test-1", trigger: "manual", startedAt: new Date().toISOString(),
      stages: ["business_intelligence"], status: "completed",
      failureCount: 0, retryCount: 0, situationCount: 0, planCount: 0,
    });

    const log = getAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].correlationId).toBe("test-1");
  });
});

describe("PipelineMetrics", () => {
  it("should record and compute metrics", async () => {
    const { recordExecution, getMetrics } = await import("../../src/eios-runtime/PipelineMetrics");

    recordExecution({ success: true, trigger: "manual", durationMs: 100, stages: ["business_intelligence"] });
    recordExecution({ success: true, trigger: "scheduler", durationMs: 200, stages: ["business_intelligence"] });
    recordExecution({ success: false, trigger: "manual", durationMs: 300, stages: ["business_intelligence"] });

    const metrics = getMetrics();
    expect(metrics.totalExecutions).toBe(3);
    expect(metrics.successfulExecutions).toBe(2);
    expect(metrics.failedExecutions).toBe(1);
    expect(metrics.successRate).toBe(67);
    expect(metrics.executionsByTrigger["manual"]).toBe(2);
  });
});

describe("PipelineScheduler", () => {
  it("should schedule and unschedule tasks", async () => {
    const { schedulePipeline, unschedulePipeline, getScheduledTasks } = await import("../../src/eios-runtime/PipelineScheduler");

    const id = schedulePipeline(60000, 1);
    expect(id).toBeTruthy();

    const tasks = getScheduledTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].intervalMs).toBe(60000);

    const removed = unschedulePipeline(id);
    expect(removed).toBe(true);
    expect(getScheduledTasks().length).toBe(0);
  });
});

describe("TriggerManager", () => {
  it("should fire a pipeline through trigger handler", async () => {
    const { TriggerManager, setTriggerHandler } = await import("../../src/eios-runtime/TriggerManager");
    const { RuntimeState } = await import("../../src/eios-runtime/RuntimeState");
    const { createPipelineContext } = await import("../../src/eios-runtime/PipelineContext");
    const { clearStages } = await import("../../src/eios-runtime/PipelineRegistry");
    const { registerStage } = await import("../../src/eios-runtime/PipelineRegistry");

    clearStages();
    RuntimeState.start();
    let stageExecuted = false;

    registerStage("business_intelligence", async () => { stageExecuted = true; });

    setTriggerHandler(async (ctx) => {
      const { executePipeline } = await import("../../src/eios-runtime/PipelineController");
      return executePipeline(ctx);
    });

    const result = await TriggerManager.fire("manual", 1);
    expect(result).toBeDefined();
    expect(stageExecuted).toBe(true);
    expect(result!.context.status).toBe("completed");
  });

  it("should not fire when runtime is stopped", async () => {
    const { TriggerManager } = await import("../../src/eios-runtime/TriggerManager");
    const { RuntimeState } = await import("../../src/eios-runtime/RuntimeState");
    RuntimeState.stop();
    const result = await TriggerManager.fire("manual");
    expect(result).toBeNull();
  });
});

describe("EIOSOrchestrator", () => {
  it("should initialize and run a pipeline", async () => {
    const { EIOSOrchestrator } = await import("../../src/eios-runtime/EIOSOrchestrator");

    EIOSOrchestrator.initialize();
    expect(EIOSOrchestrator.isRunning()).toBe(true);

    const result = await EIOSOrchestrator.runManual(1);
    expect(result).toBeDefined();
    expect(result!.context.sourceTrigger).toBe("manual");
    expect(result!.executedStages.length).toBeGreaterThan(0);

    EIOSOrchestrator.shutdown();
    expect(EIOSOrchestrator.isRunning()).toBe(false);
  });

  it("should initialize without error", async () => {
    const { initializeEIOSRuntime, shutdownEIOSRuntime } = await import("../../src/eios-runtime");
    expect(() => initializeEIOSRuntime()).not.toThrow();
    shutdownEIOSRuntime();
  });
});
