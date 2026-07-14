import type { ComponentId } from "../contracts/ComponentId";
import { formatComponentId } from "../contracts/ComponentId";
import type { PipelineContext, ContextDelta, ExecutionResult } from "../contracts/PipelineContracts";
import { PipelineContext as PipelineContextImpl } from "../public/PipelineContext";
import { PipelineStageRegistry } from "./runtime-metadata/PipelineStageRegistry";
import { PipelineGraphRegistry } from "./runtime-metadata/PipelineGraphRegistry";
import { PipelineProfileRegistry } from "./runtime-metadata/PipelineProfileRegistry";
import { RegistryLifecycle } from "./runtime-metadata/RegistryLifecycle";
import { PipelineAudit } from "./PipelineAudit";
import { PipelineMetrics } from "./PipelineMetrics";
import { ObserverEngine } from "../public/ObserverEngine";
import { MetricsEngine } from "./runtime-observability/MetricsEngine";
import { TraceManager } from "./runtime-observability/TraceManager";
import { PerformanceBudget } from "./runtime-observability/PerformanceBudget";
import { CircuitBreaker } from "./runtime-observability/CircuitBreaker";
import { BulkheadManager } from "./runtime-observability/BulkheadManager";
import { BackpressureController } from "./runtime-observability/BackpressureController";
import { RuntimeLogger } from "./runtime-observability/RuntimeLogger";

function sleepMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, stageName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Stage '${stageName}' timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export const PipelineEngine = {
  async execute(profileId: string, ctx: PipelineContextImpl): Promise<ExecutionResult> {
    if (!RegistryLifecycle.isFrozen()) {
      throw new Error("Pipeline cannot execute before registries are FROZEN");
    }

    // EPIC D: Backpressure check
    try {
      return await BackpressureController.execute(() => this.executeInternal(profileId, ctx));
    } catch (err) {
      return {
        correlationId: ctx.correlationId,
        success: false,
        durationMs: 0,
        stages: [],
        failures: [{ stage: { namespace: "eios.core", type: "stage", name: "backpressure", version: { major: 0, minor: 0, patch: 0 } }, error: String(err) }],
      };
    }
  },

  async executeInternal(profileId: string, ctx: PipelineContextImpl): Promise<ExecutionResult> {
    // EPIC D: Create execution trace
    const traceId = TraceManager.createTrace();
    const pipelineSpan = TraceManager.createSpan("pipeline", traceId);

    MetricsEngine.counter("pipeline.execution_count").inc();
    MetricsEngine.gauge("pipeline.active_count").set(1);

    const profile = PipelineProfileRegistry.getByIntent(profileId) || PipelineProfileRegistry.get(parseComponentIdSimple(profileId));
    if (!profile) {
      TraceManager.endSpan(pipelineSpan.spanId, "error");
      MetricsEngine.counter("pipeline.failure_rate").inc();
      MetricsEngine.gauge("pipeline.active_count").set(0);
      return {
        correlationId: ctx.correlationId,
        success: false,
        durationMs: 0,
        stages: [],
        failures: [{ stage: { namespace: "eios.core", type: "stage", name: "profile_resolve", version: { major: 0, minor: 0, patch: 0 } }, error: `Profile not found: ${profileId}` }],
      };
    }

    const startTime = Date.now();
    const executedStages: ComponentId[] = [];
    const failures: Array<{ stage: ComponentId; error: string }> = [];
    let retries = 0;

    const executionOrder = PipelineGraphRegistry.getExecutionOrderForIds(
      profile.intents.length > 0 ? [] : [profileId],
      ctx
    );

    const stageIds = executionOrder.length > 0 ? executionOrder : PipelineStageRegistry.getActive().map(s => s.id);

    RuntimeLogger.info("PipelineEngine", "Pipeline started", { correlationId: ctx.correlationId, traceId, pipelineId: profileId });

    // Emit pipeline.started event
    ObserverEngine.dispatch({
      id: `evt-${Date.now().toString(36)}`,
      correlationId: ctx.correlationId,
      type: { namespace: "eios.core", type: "event", name: "pipeline.started", version: { major: 1, minor: 0, patch: 0 } },
      payload: { correlationId: ctx.correlationId, trigger: profileId, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });

    for (const stageId of stageIds) {
      const stage = PipelineStageRegistry.get(stageId);
      if (!stage) continue;

      if (stage.canRun && !stage.canRun(ctx)) {
        PipelineAudit.record({ stageId: formatComponentId(stageId), status: "skipped", durationMs: 0 });
        continue;
      }

      let stageSuccess = false;
      let attempts = 0;

      while (attempts <= stage.retries && !stageSuccess) {
        attempts++;
        if (attempts > 1) retries++;
        const stageStart = Date.now();
        const stageName = stage.id.name;

        // EPIC D: Create stage span
        const stageSpan = TraceManager.createSpan(`stage:${stageName}`, traceId, pipelineSpan.spanId);

        // Exponential backoff between retries
        if (attempts > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 2), 10000) + Math.random() * 500;
          await sleepMs(delay);
        }

        try {
          // EPIC D: Circuit breaker + Bulkhead isolation
          const delta: ContextDelta = await CircuitBreaker.call(`stage:${stageName}`, () =>
            BulkheadManager.execute("PipelineEngine", () =>
              withTimeout(stage.execute(ctx), stage.timeout, stageName)
            )
          );

          ctx.apply(delta);
          stageSuccess = true;
          executedStages.push(stageId);

          const stageDuration = Date.now() - stageStart;
          TraceManager.endSpan(stageSpan.spanId, "ok", { durationMs: stageDuration });

          // EPIC D: Performance budget check
          PerformanceBudget.check("stage", stageDuration, stageName);

          // EPIC D: Metrics
          MetricsEngine.histogram("stage.execution_duration").record(stageDuration);
          MetricsEngine.counter("stage.completed").inc();

          PipelineAudit.record({
            stageId: formatComponentId(stageId),
            status: "completed",
            durationMs: stageDuration,
            retryCount: attempts - 1,
          });
          PipelineMetrics.recordStage(formatComponentId(stageId), stageDuration, true);

          // Emit stage.completed event
          ObserverEngine.dispatch({
            id: `evt-${Date.now().toString(36)}`,
            correlationId: ctx.correlationId,
            type: { namespace: "eios.core", type: "event", name: "stage.completed", version: { major: 1, minor: 0, patch: 0 } },
            payload: { correlationId: ctx.correlationId, stageId: formatComponentId(stageId), durationMs: stageDuration },
            timestamp: new Date().toISOString(),
            version: { major: 1, minor: 0, patch: 0 },
          });
        } catch (err) {
          const errorStr = String(err);
          TraceManager.endSpan(stageSpan.spanId, "error", { error: errorStr });

          // EPIC D: Metrics
          MetricsEngine.counter("stage.failed").inc();

          // Emit stage.failed event
          ObserverEngine.dispatch({
            id: `evt-${Date.now().toString(36)}`,
            correlationId: ctx.correlationId,
            type: { namespace: "eios.core", type: "event", name: "stage.failed", version: { major: 1, minor: 0, patch: 0 } },
            payload: { correlationId: ctx.correlationId, stageId: formatComponentId(stageId), error: errorStr },
            timestamp: new Date().toISOString(),
            version: { major: 1, minor: 0, patch: 0 },
          });

          if (attempts > stage.retries) {
            // RC3 FIX: Copy array before reversing to avoid permanent mutation
            const rollbackOrder = [...executedStages].reverse();
            for (const done of rollbackOrder) {
              const doneStage = PipelineStageRegistry.get(done);
              if (doneStage?.rollback) {
                try { await doneStage.rollback(ctx); } catch { }
              }
            }

            failures.push({ stage: stageId, error: errorStr });

            PipelineAudit.record({
              stageId: formatComponentId(stageId),
              status: "failed",
              durationMs: Date.now() - stageStart,
              error: errorStr,
              retryCount: attempts - 1,
            });
            PipelineMetrics.recordStage(formatComponentId(stageId), Date.now() - stageStart, false);
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const success = failures.length === 0;

    TraceManager.endSpan(pipelineSpan.spanId, success ? "ok" : "error", { durationMs });

    // EPIC D: Metrics
    MetricsEngine.counter(success ? "pipeline.success_rate" : "pipeline.failure_rate").inc();
    MetricsEngine.histogram("pipeline.avg_duration").record(durationMs);
    MetricsEngine.gauge("pipeline.active_count").set(0);
    MetricsEngine.counter("pipeline.retry_count").inc(retries);

    PipelineMetrics.recordExecution({
      success,
      trigger: profileId,
      durationMs,
      stages: executedStages,
    });

    RuntimeLogger.info("PipelineEngine", `Pipeline ${success ? "completed" : "failed"}`, {
      correlationId: ctx.correlationId, traceId, duration: durationMs, metadata: { stages: executedStages.length, retries },
    });

    // EPIC D: Performance budget
    PerformanceBudget.check("pipeline", durationMs, "PipelineEngine");

    // Emit pipeline.completed event
    ObserverEngine.dispatch({
      id: `evt-${Date.now().toString(36)}`,
      correlationId: ctx.correlationId,
      type: { namespace: "eios.core", type: "event", name: success ? "pipeline.completed" : "pipeline.error", version: { major: 1, minor: 0, patch: 0 } },
      payload: { correlationId: ctx.correlationId, success, durationMs, error: success ? undefined : failures[0]?.error },
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });

    return {
      correlationId: ctx.correlationId,
      success,
      durationMs,
      stages: executedStages,
      failures,
    };
  },
};

function parseComponentIdSimple(id: string): ComponentId {
  const parts = id.split(":");
  const nv = parts[2]?.split("@") || [id];
  const vp = nv[1]?.split(".") || ["0", "0", "0"];
  return {
    namespace: parts[0] || "eios",
    type: (parts[1] || "stage") as any,
    name: nv[0] || id,
    version: { major: parseInt(vp[0]) || 0, minor: parseInt(vp[1]) || 0, patch: parseInt(vp[2]) || 0 },
  };
}
