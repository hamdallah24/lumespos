// FOUNDATION FILE — Modification Policy: Only bug fixes. ADR Required. Owner: CTO.
// ECP-040 Sprint 5: Execution Driver — Full Lifecycle Controller
// SINGLE source of execution loop. Governor created here ONLY.
// NO other file may create ExecutionGovernor.

import { ExecutionGovernor } from "./execution-governor";
import { PipelineContext } from "./execution-context";
import { callLLMWithTools } from "../../llm/llm-adapter";
import { executeToolWithResult, getToolLabel } from "../../tools/tool-adapter";
import { remember } from "../../../services/ai-memory-service";
import { stripDSML, sanitizeMessages, validateResponse } from "../validator";
import { contextManager } from "../../../memory/ContextManager";
import { missionIntelligence } from "../../../memory/MissionIntelligence";
import { MissionBudgetTracker } from "../../../memory/MissionBudgetTracker";

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

    // ADR-010 Phase 3: Mission Budget Tracker (pure observer)
    const budgetTracker = new MissionBudgetTracker();

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
      const result = await callLLMWithTools(messages, tools, maxTokens, false, jsonMode);
      const tokensThisCycle = result.tokensUsed;

      // ── Error: retry with fallback (no tools, smaller prompt) ──
      if (result.status === "error") {
        // Retry once with fallback: no tools, conservative maxTokens
        const retry = await callLLMWithTools(messages, [], Math.min(maxTokens, 2000), false, jsonMode);
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
      const filePaths: string[] = [];
      for (const tc of result.toolCalls) {
        const label = getToolLabel(tc.name);
        this.callbacks.onProgress?.(label);
        this.callbacks.onTool?.({ name: tc.name, status: "started" });
        const tr = await executeToolWithResult(tc.name, tc.args);
        this.callbacks.onTool?.({ name: tc.name, status: "completed", durationMs: tr.durationMs });
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: tr.output });
        toolStatuses.push({ name: tr.name, durationMs: tr.durationMs, status: tr.status });

        // ADR-010: Track file paths for evidence quality scoring
        if (["readFile", "fetchGitHubFile", "fetchGitHubDir"].includes(tc.name) && tc.args?.path) {
          filePaths.push(tc.args.path);
        }
      }

      // ADR-010 Phase 2: Artifact Compression — use summary for long tool outputs
      const compressedTools = toolResults.map((t: any) => ({
        ...t,
        content: contextManager.compressToolOutput(t.content),
      }));

      messages.push(result.message, ...compressedTools);

      // ADR-010 Phase 2: Sliding History — keep recent context only
      const compressed = contextManager.compressHistory(messages, 14);
      messages.length = 0;
      messages.push(...compressed);

      // ── Observe ──
      this.governor.afterCycle(true, toolStatuses, tokensThisCycle, undefined, filePaths.length > 0 ? filePaths : undefined);

      // ADR-010 Phase 3: Record hierarchical budget
      const toolChars = toolResults.reduce((s: number, t: any) => s + String(t.content || "").length, 0);
      budgetTracker.recordCycle(
        context.cycle, tokensThisCycle, toolChars,
        this.governor.budget.usage.tokens,
        this.governor.strategyEngine.strategy,
        this.governor.metrics.evidenceQuality,
        this.governor.metrics.confidence,
      );

      // RFC-012 Phase 8: MissionIntelligence evaluates → driver reads decision
      const miResult = missionIntelligence.evaluate({
        evidenceQuality: this.governor.metrics.evidenceQuality,
        confidence: this.governor.metrics.confidence,
        cyclesExecuted: this.governor.metrics.cyclesExecuted,
        strategy: this.governor.strategyEngine.strategy,
        budgetExhausted: this.governor.budget.isExceeded().exceeded,
      });

      // CONCLUDE now — force text-only response immediately, don't wait for next loop
      if (miResult.decision === "CONCLUDE") {
        // Push synthesis instruction: structured analysis, not generic summary
        messages.push({ role: "user", content: `[GOVERNOR] CONCLUDE. Waktu menyimpulkan. Berdasarkan SEMUA file dan command output yang sudah kamu baca, buat laporan analisis TEKNIS:

IMPORTANT: Jika output command sangat panjang (log, PM2, systemctl), JANGAN menyalin transkrip penuh. Sebaliknya, ringkas berdasarkan POLA:
- Jumlah error ditemukan
- Jenis error (HTTP 400, timeout, OOM)  
- Timestamp terbaru
- Service yang terdampak

## Root Cause
[JELASKAN penyebab utama. Sebutkan file spesifik + line number.]

## Verified Evidence
[SEBUTKAN setiap file/command yang SUDAH kamu baca. Format: "Saya MEMBACA [filepath] dan MENEMUKAN [fakta spesifik] di line [nomor]."]
[JANGAN GUNAKAN kata: "kemungkinan", "mungkin", "bisa jadi", "diduga".]

## Rekomendasi Teknis
1. [Langkah spesifik]
2. [Langkah spesifik]

## Confidence Justification
Confidence [XX]% karena: [evidence item 1], [evidence item 2]

## Persetujuan
Minta persetujuan Founder.` });

        const finalResult = await callLLMWithTools(messages, [], Math.min(maxTokens, 4000), false, false);
        const finalContent = stripDSML(finalResult.content || "");
        const validated = validateResponse(finalContent);
        if (validated.cleanedText) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        console.log(budgetTracker.summary(this.governor.budget.allocation));
        this.governor.finishExecution(context.contract);
        return validated.cleanedText;
      }

      // ── Evaluate → safety net final call ──
      if (!this.governor.shouldContinue()) {
        const finalText = await this.doFinalCall(messages, tools, maxTokens, userId, mode, user, result.message, jsonMode);
        // Fallback: if final call returns empty, retry with forced text-only prompt
        if (!finalText) {
          const shortMessages = [{ role: "system", content: "You are an AI assistant. Based on the tools you used, provide a concise summary of what you found. Output in plain text, no tools." }];
          const fallback = await callLLMWithTools(shortMessages, [], 2000, false, jsonMode);
          context.result = stripDSML(fallback.content || "Unable to produce summary.");
        } else {
          context.result = finalText;
        }
        console.log(budgetTracker.summary(this.governor.budget.allocation));
        this.governor.finishExecution(context.contract);
        return finalText;
      }
    }

    console.log(budgetTracker.summary(this.governor.budget.allocation));
    return "";
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
