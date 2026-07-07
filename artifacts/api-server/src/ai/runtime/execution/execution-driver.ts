// ECP-040 Sprint 5: Execution Driver — Full Lifecycle Controller
// SINGLE source of execution loop. Governor created here ONLY.
// NO other file may create ExecutionGovernor.
// Each strategy cycle enforces behavioral contract: allowed tools + required output.

import { ExecutionGovernor } from "./execution-governor";
import { PipelineContext } from "./execution-context";
import { callLLMWithTools } from "../../llm/llm-adapter";
import { executeToolWithResult, getToolLabel } from "../../tools/tool-adapter";
import { remember } from "../../../services/ai-memory-service";
import { stripDSML, sanitizeMessages, validateResponse } from "../validator";
import { contextManager } from "../../../memory/ContextManager";
import { missionIntelligence } from "../../../memory/MissionIntelligence";
import { MissionBudgetTracker } from "../../../memory/MissionBudgetTracker";

interface CycleContract {
  allowedTools: string[];
  mustUseTools: boolean;
}

const CYCLE_CONTRACT: Record<string, CycleContract> = {
  EXPLORE: {
    allowedTools: ["searchContent", "listDirectory", "fetchGitHubDir", "readFile"],
    mustUseTools: true,
  },
  INVESTIGATE: {
    allowedTools: ["readFile", "fetchGitHubFile", "getDependencies"],
    mustUseTools: true,
  },
  ANALYZE: {
    allowedTools: ["readFile"],
    mustUseTools: false,
  },
  IMPLEMENT: {
    allowedTools: ["writeFile", "editFile", "execCommand", "sshExec"],
    mustUseTools: false,
  },
  VERIFY: {
    allowedTools: ["execCommand", "readFile"],
    mustUseTools: true,
  },
  CONCLUDE: {
    allowedTools: [],
    mustUseTools: false,
  },
  ESCALATE: {
    allowedTools: [],
    mustUseTools: false,
  },
};

export interface DriverCallbacks {
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("./execution-manifest").ExecutionSnapshot) => void;
  onImplPlan?: (plan: string) => Promise<boolean>;
}

export class ExecutionDriver {
  readonly governor: ExecutionGovernor;
  private readonly callbacks: DriverCallbacks;
  private _toolsUsed = 0;
  private _cycleOutputs: string[] = [];
  private _implGatePassed = false;
  private _implPlan = "";

  constructor(
    complexity: string, domain: string, entities: string[], objective: string,
    callbacks?: DriverCallbacks,
  ) {
    this.governor = new ExecutionGovernor(complexity, domain, entities, objective, callbacks?.onExecutionEvent);
    this.callbacks = callbacks || {};
  }

  plan(role: string, spec: { intent?: string; domain?: string; complexity?: string; objective?: string; entities?: string[]; targetFiles?: string[] }): PipelineContext {
    const contract = this.governor.planExecution(role, spec);
    const ctx = new PipelineContext(contract);
    ctx.onProgress = this.callbacks.onProgress;
    ctx.onTool = this.callbacks.onTool;
    ctx.onExecutionEvent = this.callbacks.onExecutionEvent;
    return ctx;
  }

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
    let _prevCycleMsgIndex = -1;

    const budgetTracker = new MissionBudgetTracker();
    this._cycleOutputs = [];
    this._implGatePassed = false;
    this._implPlan = "";

    while (this.governor.shouldContinue()) {
      context.cycle = this.governor.beforeCycle();
      const strategy = this.governor.strategyEngine.strategy;
      const contract = CYCLE_CONTRACT[strategy];

      // Safety: rebuild messages jika corrupted (chars=0)
      if (messages.length === 0 || messages.every(m => !m?.content && !m?.tool_calls)) {
        messages.push({ role: "user", content: `[GOVERNOR] Resume: ${context.contract.objective || "continue analysis"}` });
      }

      // ── Strategy Change: inject compressed previous cycle outputs ──
      // Contract instruction is NOT injected — tool filtering enforces behavior.
      // Previous cycle outputs are fed once as compressed context.
      if (strategy !== _prevStrategy) {
        _prevStrategy = strategy;

        if (this._cycleOutputs.length > 0 && _prevCycleMsgIndex === -1) {
          const raw = `${this._cycleOutputs.join("\n\n")}`;
          const compressed = contextManager.compressToolOutput(raw);
          messages.push({ role: "user", content: `[HASIL SIKLUS SEBELUMNYA]\n${compressed}` });
          _prevCycleMsgIndex = messages.length - 1;
        }
      }

      // ── IMPLEMENT Gate: plan + CEO approval before write tools ──
      if (strategy === "IMPLEMENT" && !this._implGatePassed) {
        this._implGatePassed = true;

        const planPrompt = `[GOVERNOR] ANDA AKAN MEMASUKI FASE IMPLEMENTASI.

Sebelum menulis file, buat Implementation Plan terlebih dahulu:

## Files to Create/Modify
[Daftar file + path lengkap]

## Specific Changes
[Perubahan spesifik per file]

## Technical Rationale
[Alasan teknis setiap perubahan]

Setelah plan disetujui CEO, Anda akan mendapat akses writeFile/editFile.`;

        messages.push({ role: "user", content: planPrompt });
        const planResult = await callLLMWithTools(messages, [], 4000, false, jsonMode);
        this._implPlan = stripDSML(planResult.content || "");
        messages.pop();
        messages.push({ role: "assistant", content: `[IMPLEMENTATION PLAN SUBMITTED]\n${this._implPlan}` });

        this._cycleOutputs.push(`[IMPLEMENT PLAN]\n${this._implPlan}`);

        if (this.callbacks.onImplPlan) {
          const approved = await this.callbacks.onImplPlan(this._implPlan);
          if (!approved) {
            messages.push({ role: "user", content: "[GOVERNOR] CEO MENOLAK rencana implementasi. Akhiri dengan CONCLUDE tanpa menulis file." });
            const rejectedResult = await callLLMWithTools(messages, [], 4000, false, jsonMode);
            const rejectedText = stripDSML(rejectedResult.content || "");
            const validated = validateResponse(rejectedText);
            if (validated.cleanedText) {
              await remember(userId, mode, user, validated.cleanedText);
              context.result = validated.cleanedText;
            }
            await this._autoGitSync();
            this.governor.finishExecution(context.contract);
            return validated.cleanedText || "";
          }
        }

        continue;
      }

      // ── Filter tools per cycle contract ──
      let activeTools = tools;
      if (contract && contract.allowedTools.length > 0) {
        activeTools = tools.filter(t => contract.allowedTools.includes(t.name));
      } else if (contract && contract.allowedTools.length === 0) {
        activeTools = [];
      }

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || typeof m !== "object") throw new Error(`Invalid message at index ${i}`);
        if (!["user", "assistant", "system", "tool"].includes(m.role)) throw new Error(`Invalid role at ${i}: "${m.role}"`);
      }

      const result = await callLLMWithTools(messages, activeTools, maxTokens, false, jsonMode);
      const tokensThisCycle = result.tokensUsed;

      // ── Error: retry with fallback ──
      if (result.status === "error") {
        const retry = await callLLMWithTools(messages, [], Math.min(maxTokens, 2000), false, jsonMode);
        const text = stripDSML(retry.content || "");
        const validated = validateResponse(text);
        if (validated.cleanedText) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        if (validated.cleanedText) { await this._autoGitSync(); return validated.cleanedText; }
        await this._autoGitSync();
        this.governor.finishExecution(context.contract);
        return "";
      }

      // ── No tool calls → text response ──
      if (result.status === "ok") {
        const content = stripDSML(result.content);
        const validated = validateResponse(content);

        if (contract && contract.mustUseTools && this._toolsUsed === 0) {
          messages.push({ role: "user", content: `[GOVERNOR] Siklus ${strategy} WAJIB menggunakan tools.` });
          continue;
        }

        if (validated.cleanedText) {
          this._cycleOutputs.push(`[${strategy}]\n${validated.cleanedText}`);
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        await this._autoGitSync();
        return validated.cleanedText;
      }

      // ── Execute tool calls ──
      this._toolsUsed += result.toolCalls.length;
      const toolResults: any[] = [];
      const toolStatuses: { name: string; durationMs: number; status: "ok" | "error" }[] = [];
      const filePaths: string[] = [];
      let assistantText = "";

      for (const tc of result.toolCalls) {
        if (contract && contract.allowedTools.length > 0 && !contract.allowedTools.includes(tc.name)) {
          continue;
        }

        const label = getToolLabel(tc.name);
        this.callbacks.onProgress?.(label);
        this.callbacks.onTool?.({ name: tc.name, status: "started" });
        const tr = await executeToolWithResult(tc.name, tc.args);
        this.callbacks.onTool?.({ name: tc.name, status: "completed", durationMs: tr.durationMs });
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: tr.output });
        toolStatuses.push({ name: tr.name, durationMs: tr.durationMs, status: tr.status });

        if (["readFile", "fetchGitHubFile", "fetchGitHubDir"].includes(tc.name) && tc.args?.path) {
          filePaths.push(tc.args.path);
        }
      }

      // Capture assistant text as intermediate output
      if (result.message?.content) {
        const text = stripDSML(result.message.content);
        if (text) {
          assistantText = text;
          this._cycleOutputs.push(`[${strategy}]\n${text}`);
        }
      }

      // ── Compress tool outputs ──
      const compressedTools = toolResults.map((t: any) => ({
        ...t,
        content: contextManager.compressToolOutput(t.content),
      }));

      messages.push(result.message, ...compressedTools);

      // ── Sliding History ──
      const compressed = contextManager.compressHistory(messages, 14);
      messages.length = 0;
      messages.push(...compressed);

      // ── Observe ──
      this.governor.afterCycle(true, toolStatuses, tokensThisCycle, undefined, filePaths.length > 0 ? filePaths : undefined);

      const goalProgress = this.governor.goalTree.progress();

      const toolChars = toolResults.reduce((s: number, t: any) => s + String(t.content || "").length, 0);
      budgetTracker.recordCycle(
        context.cycle, tokensThisCycle, toolChars,
        this.governor.budget.usage.tokens,
        this.governor.strategyEngine.strategy,
        this.governor.metrics.evidenceQuality,
        this.governor.metrics.confidence,
      );

      const miResult = missionIntelligence.evaluate({
        evidenceQuality: this.governor.metrics.evidenceQuality,
        confidence: this.governor.metrics.confidence,
        cyclesExecuted: this.governor.metrics.cyclesExecuted,
        strategy: this.governor.strategyEngine.strategy,
        budgetExhausted: this.governor.budget.isExceeded().exceeded,
        goalProgress,
      });

      // ── CONCLUDE ──
      if (miResult.decision === "CONCLUDE") {
        const ctxFeed = this._cycleOutputs.length > 0
          ? `\n\n[HASIL SIKLUS]\n${contextManager.compressToolOutput(this._cycleOutputs.join("\n\n---\n\n"))}`
          : "";

        messages.push({ role: "user", content: `[GOVERNOR] CONCLUDE.

## Root Cause
[JELASKAN penyebab utama. Sebutkan file spesifik + line number.]

## Verified Evidence
[Format: file:line → fakta. JANGAN gunakan "mungkin", "kemungkinan".]

## Rekomendasi Teknis
1. [Langkah spesifik]
2. [Langkah spesifik]

## Confidence
[XX]% — [alasan]

## Persetujuan
Minta persetujuan Founder.${ctxFeed}` });

        const finalResult = await callLLMWithTools(messages, [], Math.min(maxTokens, 8000), false, false);
        const finalContent = stripDSML(finalResult.content || "");
        const validated = validateResponse(finalContent);
        if (validated.cleanedText) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        console.log(budgetTracker.summary(this.governor.budget.allocation));
        await this._autoGitSync();
        this.governor.finishExecution(context.contract);
        return validated.cleanedText;
      }

      // ── Evaluate → safety net final call ──
      if (!this.governor.shouldContinue()) {
        const finalText = await this.doFinalCall(messages, tools, maxTokens, userId, mode, user, result.message, jsonMode);
        if (!finalText) {
          const shortMessages = [{ role: "system", content: "Provide a concise summary of your findings." }];
          const fallback = await callLLMWithTools(shortMessages, [], 2000, false, jsonMode);
          context.result = stripDSML(fallback.content || "Unable to produce summary.");
        } else {
          context.result = finalText;
        }
        console.log(budgetTracker.summary(this.governor.budget.allocation));
        await this._autoGitSync();
        this.governor.finishExecution(context.contract);
        return finalText;
      }
    }

    console.log(budgetTracker.summary(this.governor.budget.allocation));
    await this._autoGitSync();
    return "";
  }

  private async _autoGitSync(): Promise<void> {
    const hasImpl = this._cycleOutputs.some(o => o.startsWith("[IMPLEMENT]"));
    if (!hasImpl) return;
    try {
      await executeToolWithResult("execCommand", { command: "git add -A" });
      await executeToolWithResult("execCommand", { command: 'git commit -m "auto: CTO changes" --allow-empty' });
      await executeToolWithResult("execCommand", { command: "git push" });
    } catch {}
  }

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
