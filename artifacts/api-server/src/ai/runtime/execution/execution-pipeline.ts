// FOUNDATION FILE — Modification Policy: Only bug fixes. ADR Required. Owner: CTO.
// ECP-040 Sprint 5: Execution Pipeline — Single entry point for all execution
// Creates Driver, delegates to driver.run(), returns result.

import { ExecutionDriver } from "./execution-driver";
import { PipelineContext } from "./execution-context";
import type { ExecutionContract } from "./execution-manifest";

export interface PipelineSpec {
  role: "CEO" | "CTO" | "COO";
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
  onImplPlan?: (plan: string) => Promise<boolean>;
}

export interface PipelineResult {
  success: boolean;
  text: string;
  contract: ExecutionContract;
  context: PipelineContext;
  toolsUsed: number;
  filesRead: string[];
}

export class ExecutionPipeline {
  /** Execute with messages array — full lifecycle loop */
  static async execute(
    spec: PipelineSpec,
    messages: any[],
    tools: { name: string; description: string; parameters: Record<string, any> }[],
    maxTokens: number,
    userId: number,
    mode: string,
    user: string,
    jsonMode = false,
    callbacks?: PipelineCallback,
    executionSpec?: { complexity?: string; domain?: string; entities?: string[]; objective?: string; targetFiles?: string[] },
  ): Promise<PipelineResult> {
    const needsImpl = spec.intent === "implement_change" || (executionSpec?.targetFiles?.length ?? 0) > 0;
    const driver = new ExecutionDriver(
      executionSpec?.complexity || "medium",
      executionSpec?.domain || "general",
      executionSpec?.entities || [],
      executionSpec?.objective || user.slice(0, 100),
      callbacks,
      needsImpl,
    );

    const context = driver.plan(spec.role, {
      intent: spec.intent,
      domain: spec.domain || executionSpec?.domain,
      complexity: spec.complexity || executionSpec?.complexity,
      objective: spec.objective || executionSpec?.objective,
      entities: spec.entities || executionSpec?.entities,
      targetFiles: executionSpec?.targetFiles,
    });

    try {
      const text = await driver.run(context, messages, tools, maxTokens, userId, mode, user, jsonMode);
      return { success: true, text, contract: context.contract, context, toolsUsed: driver.toolsUsed, filesRead: driver.filesRead };
    } catch (e: any) {
      context.state = "FAILED";
      return { success: false, text: e.message || "Pipeline failed", contract: context.contract, context, toolsUsed: 0, filesRead: [] };
    }
  }
}
