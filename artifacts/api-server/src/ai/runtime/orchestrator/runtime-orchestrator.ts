// ECP-031: Runtime Orchestrator — single entry point for all AI requests
// Frozen. No request bypasses this. Every request flows through:
// Health → Resolve → Execute → Result → Knowledge Queue → Response

import type { IRuntime, RuntimeContext } from "./runtime-interface";
import type { RuntimeResult } from "./runtime-result";
import { resolver } from "./runtime-resolver";
import { checkSystemHealth } from "./runtime-health";
import { knowledgeGovernor } from "../knowledge";
import { createResult } from "./runtime-result";

class RuntimeOrchestrator {
  private _initialized = false;

  register(runtime: IRuntime): void {
    resolver.register(runtime);
  }

  async execute(ctx: RuntimeContext): Promise<RuntimeResult> {
    const t0 = Date.now();

    // Gate 1: System health
    const health = checkSystemHealth();
    if (!health.ready) {
      return createResult("Orchestrator",
        `System unavailable: ${health.failures.join(", ")}`, false);
    }

    // Gate 2: Resolve runtime
    let runtime: IRuntime;
    try {
      runtime = resolver.resolve(ctx);
    } catch {
      return createResult("Orchestrator", "No runtime available", false);
    }

    // Gate 3: Execute
    let result: RuntimeResult;
    try {
      result = await runtime.execute(ctx);
    } catch (e: any) {
      return createResult(runtime.name,
        `Runtime error: ${e?.message?.slice(0, 200) || "unknown"}`, false);
    }

    // Gate 4: Post-execution — record metrics
    result.metrics = {
      ...result.metrics,
      runtime: runtime.name,
      durationMs: Date.now() - t0,
    };

    // ECP-036 Waves 2-5: Post-execution pipeline
    try { await this.afterExecution(result, ctx); } catch { /* Non-critical */ }

    return result;
  }

  /** ECP-036: Post-execution pipeline — coordinator only, no business logic */
  private async afterExecution(result: RuntimeResult, ctx: RuntimeContext): Promise<void> {
    // Wave 2: Knowledge Queue
    try {
      const { knowledgeQueue } = await import("../knowledge/knowledge-queue");
      knowledgeQueue.push({
        type: "MISSION_COMPLETED",
        missionId: result.mission?.id || `auto-${ctx.mode || Date.now()}`,
        title: ctx.message.slice(0, 100),
        runtime: result.runtime,
        timestamp: new Date().toISOString(),
        metrics: { ...result.metrics, missionId: "", title: "", runtime: "", status: result.success ? "completed" : "failed", durationMs: result.metrics.durationMs, tokensUsed: 0, toolsCalled: 0, cyclesExecuted: 0, delegationCount: 0, verificationPassed: result.metrics.verificationPassed, completionProgress: result.success ? 100 : 0, stopReason: "" },
        artifacts: [],
        lessonsLearned: [],
        decisions: [],
      } as any);
    } catch {}

    // Wave 5: Telemetry
    try {
      const { telemetry } = await import("../observability/telemetry");
      const traceId = `req-${Date.now()}`;
      const trace = telemetry.begin(traceId, result.runtime);
      telemetry.finish(trace.traceId);
    } catch {}

    // Wave 4: Learning
    try {
      const { learningEngine } = await import("../learning/learning-engine");
      learningEngine.recordDecision(
        `decision-${Date.now()}`, result.runtime,
        ctx.message, 80, result.success ? "SUCCESS" : "FAILED",
        0, "",
      );
    } catch {}

    // Wave 3: Council trigger (conditional)
    try {
      const strategic = ["foundation", "architecture", "security", "policy"];
      if (strategic.some(t => ctx.message.toLowerCase().includes(t))) {
        const { councilManager } = await import("../council/council-manager");
        const traceId = `trace-${Date.now()}`;
        const result = councilManager.convene(ctx.message, traceId, "foundation_change");
        if (result) {
          const { createProviders } = await import("../council/opinion-provider");
          const providers = createProviders(result.session.id);
          for (const p of providers) {
            const opinion = await p.generateOpinion(ctx.message, result.session.id);
            councilManager.submitOpinion(result.session, p.runtime, opinion.recommendation, opinion.confidence, opinion.rationale);
          }
          councilManager.process(result.session, "foundation_change");
        }
      }
    } catch {}
  }
}

export const orchestrator = new RuntimeOrchestrator();
