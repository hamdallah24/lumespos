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

    return result;
  }
}

export const orchestrator = new RuntimeOrchestrator();
