// FOUNDATION FILE — Modification Policy: Only bug fixes. ADR Required. Owner: CTO.
// ECP-040 Sprint 5: Execution Driver — Full Lifecycle Controller
// SINGLE source of execution loop. Governor created here ONLY.
// NO other file may create ExecutionGovernor.

import { ExecutionGovernor } from "./execution-governor";
import { PipelineContext } from "./execution-context";
import { callLLMWithTools } from "../../llm/llm-adapter";
import { executeToolCall, executeToolWithResult, getToolLabel } from "../../tools/tool-adapter";
import { remember } from "../../../services/ai-memory-service";
import { stripDSML, sanitizeMessages, validateMessageSequence, validateResponse } from "../validator";

export const EXECUTION_INSTRUCTION: Record<string, string> = {
  EXPLORE: "Continue exploring. Find all relevant files first before analyzing.",
  INVESTIGATE: "Stop exploring. Read the files you found. Do not search again unless necessary.",
  ANALYZE: "Analyze what you have. Only call tools if critical new information is needed.",
  CONCLUDE: "Time to conclude. Provide your final response now. No more tools.",
  ESCALATE: "Cannot proceed with current resources. Report findings and stop.",
};

export interface DriverCallbacks {
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("./execution-manifest").ExecutionSnapshot) => void;
}

export class ExecutionDriver {
  readonly governor: ExecutionGovernor;
  private readonly callbacks: DriverCallbacks;

  /** Only place in the codebase where ExecutionGovernor is instantiated. */
  constructor(
    complexity: string, domain: string, entities: string[], objective: string,
    callbacks?: DriverCallbacks,
  ) {
    this.governor = new ExecutionGovernor(complexity, domain, entities, objective, callbacks?.onExecutionEvent);
    this.callbacks = callbacks || {};
  }

  /** PLAN — Governor generates ExecutionContract */
  plan(role: string, spec: { intent?: string; domain?: string; complexity?: string; objective?: string; entities?: string[] }): PipelineContext {
    const contract = this.governor.planExecution(role, spec);
    const ctx = new PipelineContext(contract);
    ctx.onProgress = this.callbacks.onProgress;
    ctx.onTool = this.callbacks.onTool;
    ctx.onExecutionEvent = this.callbacks.onExecutionEvent;
    return ctx;
  }

  /**
   * Full lifecycle loop. Runs:
   *   plan → begin → loop(injectStrategy → LLM → tools → observe → evaluate) → finalCall → finish
   * Returns the final text response.
   */
  async run(
    context: PipelineContext,
    messages: any[],
    tools: { name: string; description: string; parameters: Record<string, any> }[],
    maxTokens: number,
    userId: number,
    mode: string,
    user: string,
    jsonMode = false,
  ): Promise<string> {
    this.governor.beginExecution(context.contract);
    context.state = "EXECUTING";

    let _prevStrategy = "";

    while (this.governor.shouldContinue()) {
      context.cycle = this.governor.beforeCycle();

      // ── Strategy Injection ──
      const strategy = this.governor.strategyEngine.strategy;
      if (strategy !== _prevStrategy) {
        _prevStrategy = strategy;
        const instruction = EXECUTION_INSTRUCTION[strategy];
        if (instruction) messages.push({ role: "user", content: `[GOVERNOR] ${instruction}` });
      }

      // ── Validate messages ──
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || typeof m !== "object") throw new Error(`Invalid message at index ${i}`);
        if (!["user", "assistant", "system", "tool"].includes(m.role)) throw new Error(`Invalid role at ${i}: "${m.role}"`);
      }

      // ── LLM Call ──
      const budgetBeforeLLM = this.governor.budget.usage.tokens;
      const perCycleMax = Math.min(maxTokens, 4000); // cap per cycle, not total budget
      const result = await callLLMWithTools(messages, tools, perCycleMax, false, jsonMode);
      const tokensThisCycle = result.tokensUsed;

      // ── Error: round > 0 → throw; round 0 → retry without tools ──
      if (result.status === "error") {
        if (context.cycle > 0) throw new Error(`AI engine error at round ${context.cycle}: HTTP ${result.errorStatus}`);
        const retry = await callLLMWithTools(messages, [], perCycleMax, false, jsonMode);
        const text = stripDSML(retry.content || "");
        const validated = validateResponse(text);
        if (validated.cleanedText) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        if (validated.cleanedText) return validated.cleanedText;
        this.governor.finishExecution(context.contract);
        return "";
      }

      // ── No tool calls → text response → validate + remember + return ──
      if (result.status === "ok") {
        const content = stripDSML(result.content);
        const validated = validateResponse(content);
        if (validated.cleanedText) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        return validated.cleanedText;
      }

      // ── Execute tool calls ──
      const toolResults: any[] = [];
      const toolStatuses: { name: string; durationMs: number; status: "ok" | "error" }[] = [];
      for (const tc of result.toolCalls) {
        const label = getToolLabel(tc.name);
        this.callbacks.onProgress?.(label);
        this.callbacks.onTool?.({ name: tc.name, status: "started" });
        const tr = await executeToolWithResult(tc.name, tc.args);
        this.callbacks.onTool?.({ name: tc.name, status: "completed", durationMs: tr.durationMs });
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: tr.output });
        toolStatuses.push({ name: tr.name, durationMs: tr.durationMs, status: tr.status });
      }

      messages.push(result.message, ...toolResults);

      // ── Observe ──
      this.governor.afterCycle(true, toolStatuses, tokensThisCycle);

      // ── Per-Cycle Prompt Breakdown ──
      const budgetAfter = this.governor.budget.usage.tokens;
      const cycleUsed = budgetAfter - budgetBeforeLLM;
      const alloc = this.governor.budget.allocation;
      const cont = this.governor.shouldContinue();

      // Breakdown messages by role
      const systemChars = (messages as any[]).filter((m: any) => m.role === "system").reduce((s: number, m: any) => s + String(m.content || "").length, 0);
      const userChars   = (messages as any[]).filter((m: any) => m.role === "user").reduce((s: number, m: any) => s + String(m.content || "").length, 0);
      const assistChars = (messages as any[]).filter((m: any) => m.role === "assistant").reduce((s: number, m: any) => s + String(m.content || m.tool_calls?.map((tc: any) => tc.function?.name).join(",") || "").length, 0);
      const toolChars   = (messages as any[]).filter((m: any) => m.role === "tool").reduce((s: number, m: any) => s + String(m.content || "").length, 0);
      const totalChars  = systemChars + userChars + assistChars + toolChars;

      console.log(
        `\n${'═'.repeat(42)}` +
        `\nCycle ${context.cycle} — ${this.governor.strategyEngine.strategy}` +
        `\n${'═'.repeat(42)}` +
        `\nSystem     : ${Math.ceil(systemChars / 4)} tokens (${systemChars} chars)` +
        `\nUser       : ${Math.ceil(userChars / 4)} tokens (${userChars} chars)` +
        `\nAssistant  : ${Math.ceil(assistChars / 4)} tokens (${assistChars} chars)` +
        `\nTool Results: ${Math.ceil(toolChars / 4)} tokens (${toolChars} chars)` +
        `\nMessages   : ${messages.length} total (${(messages as any[]).filter((m: any) => m.role === "system").length} sys, ${(messages as any[]).filter((m: any) => m.role === "user").length} usr, ${(messages as any[]).filter((m: any) => m.role === "assistant").length} asst, ${(messages as any[]).filter((m: any) => m.role === "tool").length} tool)` +
        `\n${'─'.repeat(42)}` +
        `\nLLM API     : ${tokensThisCycle} tokens total` +
        `\n${'─'.repeat(42)}` +
        `\nTotal Used  : ${budgetAfter} / ${alloc.maxTokens}` +
        `\nRemaining   : ${alloc.maxTokens - budgetAfter} tokens` +
        `\nEvidence    : ${Math.round(this.governor.metrics.evidenceQuality * 100)}%` +
        `\nConfidence  : ${this.governor.metrics.confidence}%` +
        `\n${cont ? `Continue: ${this.governor.strategyEngine.strategy}` : `STOP:${this.governor.stopReason}`}` +
        `\n${'═'.repeat(42)}\n`
      );

      // ── Evaluate → safety net final call ──
      if (!this.governor.shouldContinue()) {
        this.logBudget(messages, "STOP:" + this.governor.stopReason);
        const finalText = await this.doFinalCall(messages, tools, maxTokens, userId, mode, user, result.message, jsonMode);
        context.result = finalText;
        this.governor.finishExecution(context.contract);
        return finalText;
      }
    }

    this.logBudget(messages, "LOOP-END:" + this.governor.stopReason);
    this.governor.finishExecution(context.contract);
    return "";
  }

  private logBudget(messages: any[], stopReason: string): void {
    const alloc = this.governor.budget.allocation;
    const used = this.governor.budget.usage;
    const systemMsgs = messages.filter((m: any) => m.role === "system");
    const historyMsgs = messages.filter((m: any) => m.role !== "system" && m.role !== "tool");
    const toolMsgs = messages.filter((m: any) => m.role === "tool");
    const systemTokens = Math.ceil(systemMsgs.reduce((s: number, m: any) => s + String(m.content||"").length, 0) / 4);
    const historyTokens = Math.ceil(historyMsgs.reduce((s: number, m: any) => s + String(m.content||"").length, 0) / 4);
    const toolTokens = Math.ceil(toolMsgs.reduce((s: number, m: any) => s + String(m.content||"").length, 0) / 4);
    const reasoningTokens = used.tokens - systemTokens - historyTokens - toolTokens;
    console.log(
      `\nGovernor Budget` +
      `\n────────────────────────────────` +
      `\nAllocation   : ${alloc.maxTokens} tokens (${alloc.maxTools} tools, ${alloc.maxTimeMs / 1000}s)` +
      `\n────────────────────────────────` +
      `\nInput Prompt : ${systemTokens} tokens` +
      `\nHistory      : ${historyTokens} tokens` +
      `\nTool Outputs : ${toolTokens} tokens` +
      `\nReasoning    : ${Math.max(0, reasoningTokens)} tokens` +
      `\n────────────────────────────────` +
      `\nUsed         : ${used.tokens} tokens` +
      `\nRemaining    : ${alloc.maxTokens - used.tokens} tokens` +
      `\nCycles       : ${this.governor.metrics.cyclesExecuted}` +
      `\nEvidence     : ${Math.round(this.governor.metrics.evidenceQuality * 100)}%` +
      `\nConfidence   : ${this.governor.metrics.confidence}%` +
      `\nStrategy     : ${this.governor.strategyEngine.strategy}` +
      `\nCompletion   : ${this.governor.tracker.isComplete()}` +
      `\n${stopReason}` +
      `\n────────────────────────────────\n`
    );
  }

  /** Final summarization call when Governor signals stop. Retries without tools if model keeps calling them. */
  private async doFinalCall(
    messages: any[], tools: { name: string; description: string; parameters: Record<string, any> }[],
    maxTokens: number, userId: number, mode: string, user: string, lastMsg: any, jsonMode: boolean,
  ): Promise<string> {
    const doCall = async (withTools: boolean): Promise<string> => {
      const clean = sanitizeMessages([...messages]);
      const result = await callLLMWithTools(clean, withTools ? tools : [], 8000, false, jsonMode);
      if (result.status === "tool_calls" && withTools) {
        const { tool_calls, ...rest } = result.message;
        messages.push(rest);
        return doCall(false);
      }
      const content = stripDSML(result.content || lastMsg?.content?.trim() || "");
      const validated = validateResponse(content);
      if (validated.cleanedText) await remember(userId, mode, user, validated.cleanedText);
      return validated.cleanedText;
    };
    return doCall(true);
  }
}
