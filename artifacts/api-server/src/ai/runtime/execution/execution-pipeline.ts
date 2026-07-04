// ECP-040: Execution Pipeline — Single entry point for all execution
// Menerima ExecutionSpecification, membuat contract via Governor,
// membuat Context, membuat Driver, menjalankan lifecycle, mengembalikan result.
// Setelah ECP-040, semua Runtime menggunakan pipeline ini.

import { ExecutionGovernor } from "./execution-governor";
import { ExecutionDriver, type ExecuteFn } from "./execution-driver";
import { PipelineContext } from "./execution-context";
import type { ExecutionContract } from "./execution-manifest";

export interface PipelineSpec {
  role: "CEO" | "CTO";
  intent?: string;
  domain?: string;
  complexity?: string;
  objective?: string;
  entities?: string[];
}

export interface PipelineCallback {
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("./execution-manifest").ExecutionSnapshot) => void;
}

export interface PipelineResult {
  success: boolean;
  text: string;
  contract: ExecutionContract;
  context: PipelineContext;
}

export class ExecutionPipeline {
  private readonly governor: ExecutionGovernor;

  constructor(complexity: string = "medium", domain: string = "general", entities: string[] = [], objective: string = "Execute") {
    this.governor = new ExecutionGovernor(complexity, domain, entities, objective);
  }

  /** Execute with a custom executor function */
  async execute(
    spec: PipelineSpec,
    executeFn: ExecuteFn,
    callbacks?: PipelineCallback,
  ): Promise<PipelineResult> {
    const driver = new ExecutionDriver(this.governor);

    // Stage 1: PLAN — Governor creates contract
    const context = driver.plan(spec.role, {
      intent: spec.intent,
      domain: spec.domain,
      complexity: spec.complexity,
      objective: spec.objective,
      entities: spec.entities,
    });

    // Wire callbacks
    if (callbacks) {
      context.onProgress = callbacks.onProgress;
      context.onTool = callbacks.onTool;
      context.onExecutionEvent = callbacks.onExecutionEvent;
    }

    try {
      // Stage 2-6: BEGIN → EXECUTE → OBSERVE → EVALUATE → FINISH
      await driver.run(context, executeFn);
      return { success: true, text: context.result, contract: context.contract, context };
    } catch (e: any) {
      context.state = "FAILED";
      return { success: false, text: e.message || "Pipeline failed", contract: context.contract, context };
    }
  }
}
