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
    allowedTools: ["searchContent", "listDirectory", "fetchGitHubDir", "readFile", "fetchGitHubFile", "glob",
      "getSalesSummary", "getFinancialReport", "getTopProducts", "getSalesChart",
      "getCashierPerformance", "getLowStockItems", "getInventoryLevels",
      "getOrderHistory", "getExpenseList", "getShiftAuditSummary"],
    mustUseTools: true,
  },
  ANALYZE: {
    allowedTools: ["readFile", "searchContent", "getDependencies",
      "getSalesSummary", "getFinancialReport", "getTopProducts", "getSalesChart",
      "getCashierPerformance", "getLowStockItems", "getInventoryLevels",
      "getOrderHistory", "getExpenseList", "getShiftAuditSummary"],
    mustUseTools: true,
  },
  CONCLUDE: {
    allowedTools: [],
    mustUseTools: false,
  },
  EXECUTE: {
    allowedTools: ["writeFile", "editFile", "execCommand", "sshExec", "readFile"],
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
  private _filesRead: string[] = [];
  private _cycleOutputs: string[] = [];
  private _toolDataStore: Map<string, string> = new Map(); // filePath → content
  private _searchDataStore: string[] = []; // searchContent results
  private _implGatePassed = false;
  private _implPlan = "";
  // REMOVED: _mustUseRetries — strategy engine handles text-only advancement

  get toolsUsed(): number { return this._toolsUsed; }
  get filesRead(): string[] { return [...this._filesRead]; }

  constructor(
    complexity: string, domain: string, entities: string[], objective: string,
    callbacks?: DriverCallbacks,
    needsImplementation = false,
  ) {
    this.governor = new ExecutionGovernor(complexity, domain, entities, objective, callbacks?.onExecutionEvent, needsImplementation);
    this.callbacks = callbacks || {};
    (this as any)._needsImpl = needsImplementation;
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
    this._toolDataStore.clear();
    this._searchDataStore = [];
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

      // ── Strategy Change: inject directive + compressed previous output ──
      if (strategy !== _prevStrategy) {
        console.log(`[PIPELINE:${_prevStrategy}→${strategy}] cycle=${context.cycle} toolsUsed=${this._toolsUsed} filesRead=${this._filesRead.length}`);
        _prevStrategy = strategy;
        this.governor.goalTree.advanceTo(strategy);

        // Inject directive biar LLM tau cycle ini tugasnya apa
        const directive = this.governor.strategyEngine.getDirective();
        messages.push({ role: "user", content: directive });

        if (this._cycleOutputs.length > 0) {
          const raw = this._cycleOutputs.join("\n\n");
          const compressed = contextManager.compressToolOutput(raw);
          messages.push({ role: "user", content: `[HASIL SIKLUS SEBELUMNYA]\n${compressed}` });
          _prevCycleMsgIndex = messages.length - 1;
        }
        // Inject stored tool data (file contents) for next cycle
        if (this._toolDataStore.size > 0) {
          const fileData = Array.from(this._toolDataStore.entries())
            .map(([path, content]) => `--- ${path} ---\n${content}`)
            .join("\n\n");
          const compressed = contextManager.compressToolOutput(fileData, 8000);
          messages.push({ role: "user", content: `[DATA FILE]\n${compressed}` });
        }
        if (this._searchDataStore.length > 0) {
          messages.push({ role: "user", content: `[SEARCH RESULTS]\n${this._searchDataStore.join("\n\n")}` });
        }
      }

      // ── EXECUTE Gate: cek persetujuan Founder sebelum write tools ──
      if (strategy === "EXECUTE" && !this._implGatePassed) {
        this._implGatePassed = true;
        // Jika Founder belum setuju → skip EXECUTE, kembali ke hasil CONCLUDE
        if (this.callbacks.onImplPlan) {
          const approved = await this.callbacks.onImplPlan(this._implPlan || context.result || "");
          if (!approved) {
            const finalText = context.result || "Perubahan tidak disetujui Founder.";
            await remember(userId, mode, user, finalText);
            await this._autoGitSync();
            this.governor.finishExecution(context.contract);
            return finalText;
          }
        }
        // Approval granted — inject file content asli + analysis CONCLUDE + beri tools
        // LLM akan membaca file dengan readFile lalu editFile — lebih akurat daripada regex
        const cycleData = this._cycleOutputs.join("\n\n").slice(0, 3000);
        let ctxData = "";
        if (this._toolDataStore.size > 0) {
          ctxData = Array.from(this._toolDataStore.entries())
            .map(([p, c]) => `--- ${p} ---\n${c}`).join("\n\n").slice(0, 4000);
        }
        const implHint = this._implPlan ? `\n\n[IMPLEMENTASI] ${this._implPlan.slice(0, 500)}` : "";
        messages.push({ role: "user", content: `[PERSETUJUAN] Implementasi DISETUJUI. FILE:\n${ctxData}\n\n[HASIL ANALISIS]\n${cycleData}${implHint}\n\nSEKARANG: BACA file target dulu dengan readFile untuk verifikasi, lalu editFile untuk perubahan spesifik menggunakan oldString UNIK. JANGAN tulis ulang seluruh file.` });
      }

      // ── Filter tools per cycle contract ──
      let activeTools = tools;
      if (contract && contract.allowedTools.length > 0) {
        activeTools = tools.filter(t => contract.allowedTools.includes(t.name));
      } else if (contract && contract.allowedTools.length === 0) {
        activeTools = [];
      }
      console.log(`[DRIVER:EXEC] CALL LLM strategy=${strategy} tools=${activeTools.length} cycle=${context.cycle} needsImpl=${(this as any)._needsImpl}`);

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
        if (validated.cleanedText && validated.isValid) {
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        if (validated.cleanedText && validated.isValid) { await this._autoGitSync(); return validated.cleanedText; }
        await this._autoGitSync();
        this.governor.finishExecution(context.contract);
        return "";
      }

      // ── No tool calls → text response ──
      if (result.status === "ok") {
        const content = stripDSML(result.content);
        const validated = validateResponse(content);

        // REMOVED: mustUseTools retry — strategy engine advances on text-only via _advanceTextOnly()

        // Analysis gate: tolak output kotor (garbled, file path doang, dll)
        if (!validated.isValid && validated.cleanedText) {
          messages.push({ role: "user", content: `[GOVERNOR] Output ditolak: ${validated.warnings.join(", ")}. Berikan analisis yang benar.` });
          continue;
        }

        if (validated.cleanedText) {
          this._cycleOutputs.push(`[${strategy}]\n${validated.cleanedText}`);
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        await this._autoGitSync();
        // CONCLUDE → lanjut ke EXECUTE jika needsImpl, atau return sebagai final
        if (strategy === "CONCLUDE") {
          const finalText = (context.result || validated.cleanedText || "").trim();
          // Jika output terlalu pendek (tidak ada konten berarti), retry 1x dengan instruksi lebih jelas
          if (finalText.length < 100) {
            console.log(`[CONCLUDE] Output too short (${finalText.length} chars), retrying once...`);
            const retry = await callLLMWithTools(
              [{ role: "user", content: `[GOVERNOR] Output terlalu pendek. Berikan analisis berdasarkan file yang sudah dibaca. Sertakan root cause, evidence, dan rekomendasi.` }],
              [], maxTokens, false, false,
            );
            const retryText = stripDSML(retry.content || "");
            if (retryText.length > finalText.length) { context.result = retryText; await remember(userId, mode, user, retryText); return retryText; }
          }
          // Jika needsImpl=true, jangan return — lanjut ke EXECUTE cycle
          if ((this as any)._needsImpl) {
            if (finalText) { context.result = finalText; await remember(userId, mode, user, finalText); }
            // Summarize CONCLUDE output menjadi tech spec yang PERSIS untuk EXECUTE
            try {
              const planResp = await callLLMWithTools([{ role: "user", content: `Dari analisis berikut, ekstrak spesifikasi teknis untuk implementasi.

FORMAT WAJIB:
TARGET: [path lengkap file yang perlu diubah]
SEKARANG: [teks/kode yang ADA SEKARANG — kutip persis]
MENJADI: [teks/kode BARU — lengkap]
TOOL: editFile

Analisis:
${finalText?.slice(0, 3000)}

WAJIB: Output format di atas. Minimal TARGET dan TOOL harus ada.` }], [], 1000, false, false);
              if (planResp.content) this._implPlan = planResp.content;
              console.log(`[DRIVER:SUMMARIZER] _implPlan=${this._implPlan?.slice(0, 100)}`);
            } catch (e: any) {
              console.log(`[DRIVER:SUMMARIZER] Error: ${e.message}`);
            }
            // Jika summarizer gagal, EXECUTE cycle akan panggil LLM dengan tools untuk implementasi
            // (tidak perlu fallback hardcoded — biarkan EXECUTE cycle yang memutuskan)
            continue;
          }
          if (finalText) return finalText;
          // CONCLUDE empty → fallback
          const fb = await callLLMWithTools([{ role: "user", content: `Ringkas temuan analisis: ${context.contract.objective || ""}` }], [], 2000, false, false);
          const fbText = stripDSML(fb.content || "");
          if (fbText) { context.result = fbText; await remember(userId, mode, user, fbText); return fbText; }
          return "CTO analysis completed (output unavailable)";
        }
        continue;
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

        if (["readFile", "fetchGitHubFile", "fetchGitHubDir", "searchContent"].includes(tc.name) && tc.args?.path) {
          filePaths.push(tc.args.path);
          if (!this._filesRead.includes(tc.args.path)) this._filesRead.push(tc.args.path);
        }

        // Store actual tool data before compression removes it
        if (tc.name === "readFile" && tc.args?.path && tr.output && tr.output.length > 50) {
          const filePath = tc.args.path;
          const compressed = contextManager.compressToolOutput(tr.output, 4000);
          if (!this._toolDataStore.has(filePath)) {
            this._toolDataStore.set(filePath, compressed);
          }
        }
        if (tc.name === "searchContent" && tr.output && tr.output.length > 50) {
          this._searchDataStore.push(`[${tc.args?.path || "search"}]\n${contextManager.compressToolOutput(tr.output, 2000)}`);
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

      const goalProgress = this.governor.goalTree.progress(this.governor.metrics.evidenceQuality);

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
        let ctxFeed = this._cycleOutputs.length > 0
          ? `\n\n[HASIL SIKLUS]\n${contextManager.compressToolOutput(this._cycleOutputs.join("\n\n---\n\n"))}`
          : "";
        if (this._toolDataStore.size > 0) {
          const fileData = Array.from(this._toolDataStore.entries())
            .map(([path, content]) => `--- ${path} ---\n${content}`)
            .join("\n\n");
          ctxFeed += `\n\n[DATA FILE]\n${contextManager.compressToolOutput(fileData, 8000)}`;
        }
        if (this._searchDataStore.length > 0) {
          ctxFeed += `\n\n[SEARCH RESULTS]\n${this._searchDataStore.join("\n\n")}`;
        }

        messages.push({ role: "user", content: `[GOVERNOR] CONCLUDE. Berikan analisis berdasarkan FILE yang sudah dibaca.

## Root Cause
[JELASKAN penyebab utama dengan detail]

## Verified Evidence
[Jelaskan temuan dan analisis. Kutip baris kode spesifik jika relevan.]

## Rekomendasi Teknis
1. [Langkah spesifik dengan justifikasi]
2. [Langkah spesifik dengan justifikasi]
3. [Langkah spesifik dengan justifikasi]

## Confidence
[XX]% — [alasan detail]

## Persetujuan
Minta persetujuan Founder.${ctxFeed}` });

        const finalResult = await callLLMWithTools(messages, [], maxTokens, false, false);
        let finalContent = stripDSML(finalResult.content || "");
        let validated = validateResponse(finalContent);
        let useText = validated.cleanedText || context.result || "";
        // Jika output terlalu pendek, retry 1x
        if (useText.length < 100) {
          console.log(`[CONCLUDE] Output too short (${useText.length} chars), retrying once...`);
          const retry = await callLLMWithTools(
            [{ role: "user", content: `[GOVERNOR] Output terlalu pendek. Berikan analisis berdasarkan file yang sudah dibaca dengan struktur yang diminta.` }],
            [], maxTokens, false, false,
          );
          const retryContent = stripDSML(retry.content || "");
          const retryValidated = validateResponse(retryContent);
          useText = retryValidated.cleanedText || useText;
        }
        if (useText) {
          await remember(userId, mode, user, useText);
          context.result = useText;
        }
        if (!useText || useText.length < 200) {
          const fb = await callLLMWithTools([{ role: "user", content: `Ringkas temuan analisis: ${context.contract.objective || ""} — WAJIB minimal 3 paragraf.` }], [], 2000, false, false);
          const fbText = stripDSML(fb.content || "CTO analysis completed (output unavailable)");
          context.result = fbText.length >= 200 ? fbText : useText || fbText;
          await remember(userId, mode, user, context.result);
        }
        console.log(budgetTracker.summary(this.governor.budget.allocation));
        await this._autoGitSync();
        this.governor.finishExecution(context.contract);
        return context.result;
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
        return context.result;
      }
    }

    console.log(budgetTracker.summary(this.governor.budget.allocation));
    await this._autoGitSync();
    return "";
  }

  private async _autoGitSync(): Promise<void> {
    const hasImpl = this._cycleOutputs.some(o => o.startsWith("[EXECUTE]"));
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
      const result = await callLLMWithTools(clean, withTools ? tools : [], maxTokens, false, jsonMode);
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
