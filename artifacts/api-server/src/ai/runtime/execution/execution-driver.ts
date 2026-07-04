// ECP-040: Execution Driver — Lifecycle controller
// Menggantikan while(governor.shouldContinue()) di ai-helpers.
// Driver TIDAK membuat keputusan. Driver HANYA menjalankan lifecycle.
// Semua keputusan berasal dari Governor.

import { PipelineContext } from "./execution-context";
import type { ToolResult } from "./execution-context";
import { ExecutionGovernor } from "./execution-governor";

export const EXECUTION_INSTRUCTION: Record<string, string> = {
  EXPLORE: "Continue exploring. Find all relevant files first before analyzing.",
  INVESTIGATE: "Stop exploring. Read the files you found. Do not search again unless necessary.",
  ANALYZE: "Analyze what you have. Only call tools if critical new information is needed.",
  CONCLUDE: "Time to conclude. Provide your final response now. No more tools.",
  ESCALATE: "Cannot proceed with current resources. Report findings and stop.",
};

const TIMEOUT_MS = 45000;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL;

export type ExecuteFn = (
  systemPrompt: string,
  userMessage: string,
  tools: any[],
  context: PipelineContext,
) => Promise<{
  text: string;
  hasToolCalls: boolean;
  toolCalls: { name: string; durationMs: number }[];
  tokensUsed: number;
}>;

export type InjectStrategyFn = (strategy: string, prevStrategy: string) => string | null;

export class ExecutionDriver {
  readonly governor: ExecutionGovernor;
  private readonly injectStrategy: InjectStrategyFn;

  constructor(governor: ExecutionGovernor, injectStrategy?: InjectStrategyFn) {
    this.governor = governor;
    this.injectStrategy = injectStrategy || this.defaultStrategyInjection;
  }

  /** PLAN — Governor generates ExecutionContract */
  plan(role: string, spec: { intent?: string; domain?: string; complexity?: string; objective?: string; entities?: string[] }): PipelineContext {
    const contract = this.governor.planExecution(role, spec);
    return new PipelineContext(contract);
  }

  /** BEGIN — Governor starts telemetry + transition */
  begin(context: PipelineContext): void {
    context.state = "EXECUTING";
    this.governor.beginExecution(context.contract);
  }

  /** Run the full lifecycle loop: EXECUTE → OBSERVE → EVALUATE → repeat */
  async run(context: PipelineContext, executeFn: ExecuteFn): Promise<void> {
    this.begin(context);

    while (this.governor.shouldContinue()) {
      context.cycle = this.governor.beforeCycle();

      // Strategy directive injection
      const currentStrategy = this.governor.strategyEngine.strategy;
      const instruction = this.injectStrategy(currentStrategy, context.prevStrategy);
      if (instruction) {
        context.prevStrategy = currentStrategy;
      }

      // EXECUTE: delegate to caller (Runtime handles LLM)
      const result = await executeFn(
        instruction || "",  // strategy directive (injected into messages by caller)
        "",                  // user message embedded in the loop logic
        context.contract.allowedTools || [],
        context,
      );

      // OBSERVE: Governor records metrics
      context.currentToolCalls = result.toolCalls.map(tc => ({
        name: tc.name,
        durationMs: tc.durationMs,
        status: "ok" as const,
      }));
      this.governor.observe(result.hasToolCalls, result.toolCalls, result.tokensUsed);

      // EVALUATE: Governor decides stop/continue/conclude
      const decision = this.governor.evaluate(context.contract);
      if (decision.action !== "CONTINUE") {
        break;
      }
    }

    // FINISH: Governor finalizes journal + telemetry
    context.state = "FINISHED";
    this.governor.finishExecution(context.contract);
  }

  /** Default strategy directive injection — mirrors existing behavior */
  private defaultStrategyInjection(currentStrategy: string, prevStrategy: string): string | null {
    if (currentStrategy === prevStrategy) return null;
    return EXECUTION_INSTRUCTION[currentStrategy] || null;
  }
}
