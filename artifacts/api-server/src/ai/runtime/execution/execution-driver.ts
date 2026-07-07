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
  instruction: string;
}

const CYCLE_CONTRACT: Record<string, CycleContract> = {
  EXPLORE: {
    allowedTools: ["searchContent", "glob", "listDirectory", "fetchGitHubDir"],
    mustUseTools: true,
    instruction: `[BEHAVIORAL CONTRACT — EXPLORE]
Tujuan siklus ini: Menemukan file-file relevan.
YANG DIWAJIBKAN:
- Gunakan tools: searchContent, glob, listDirectory
- Temukan dan identifikasi file terkait masalah
- Outputkan daftar file yang ditemukan + alasan relevansinya

YANG DILARANG:
- readFile — belum waktunya membaca isi
- execCommand, sshExec — tidak ada eksekusi
- Kesimpulan/analisis — ini siklus eksplorasi, bukan analisis

WAJIB hasilkan output: daftar file relevan dengan penjelasan singkat.`,
  },
  INVESTIGATE: {
    allowedTools: ["readFile", "fetchGitHubFile", "getDependencies"],
    mustUseTools: true,
    instruction: `[BEHAVIORAL CONTRACT — INVESTIGATE]
Tujuan siklus ini: Membaca dan memahami file yang sudah ditemukan.
YANG DIWAJIBKAN:
- Gunakan readFile pada file-file dari hasil eksplorasi sebelumnya
- Catat temuan per file (struktur, fungsi, pola)

YANG DILARANG:
- searchContent, glob, listDirectory — sudah selesai eksplorasi
- execCommand, sshExec — tidak ada eksekusi
- Kesimpulan akhir — masih dalam investigasi

WAJIB hasilkan output: ringkasan isi file + temuan per file.`,
  },
  ANALYZE: {
    allowedTools: ["readFile"],
    mustUseTools: false,
    instruction: `[BEHAVIORAL CONTRACT — ANALYZE]
Tujuan siklus ini: Menganalisis temuan dan menyusun kesimpulan.
YANG DIWAJIBKAN:
- Analisis root cause berdasarkan evidence
- Susun rekomendasi teknis

YANG DILARANG:
- searchContent, glob — tidak perlu cari file lagi
- execCommand, sshExec
- readFile hanya jika ada informasi kritis yang kurang

WAJIB hasilkan output: root cause analysis + rekomendasi.`,
  },
  CONCLUDE: {
    allowedTools: [],
    mustUseTools: false,
    instruction: `[BEHAVIORAL CONTRACT — CONCLUDE]
Tujuan siklus ini: Menghasilkan laporan akhir.
YANG DIWAJIBKAN:
- Laporan analisis teknis lengkap
- Root cause, evidence, rekomendasi

YANG DILARANG:
- Semua tools — TIDAK BOLEH memanggil tools
- Deskripsi proses ("saya membaca", "saya mencari")

WAJIB hasilkan output: laporan akhir.`,
  },
  ESCALATE: {
    allowedTools: [],
    mustUseTools: false,
    instruction: `[BEHAVIORAL CONTRACT — ESCALATE]
Sumber daya tidak mencukupi. Laporkan temuan yang ada dan hentikan.`,
  },
};

export interface DriverCallbacks {
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("./execution-manifest").ExecutionSnapshot) => void;
}

export class ExecutionDriver {
  readonly governor: ExecutionGovernor;
  private readonly callbacks: DriverCallbacks;
  private _toolsUsed = 0;
  private _cycleOutputs: string[] = []; // intermediate outputs from each cycle

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
   *   plan → begin → loop(strategy → filteredTools → LLM → validate tools → execute → output) → finalize
   * Each strategy enforces: allowed tools only + must produce output.
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
    let _strategyCycles = 0;

    // ADR-010 Phase 3: Mission Budget Tracker (pure observer)
    const budgetTracker = new MissionBudgetTracker();
    this._cycleOutputs = [];

    while (this.governor.shouldContinue()) {
      context.cycle = this.governor.beforeCycle();
      const strategy = this.governor.strategyEngine.strategy;
      const contract = CYCLE_CONTRACT[strategy];

      // ── Strategy Change: inject contract + previous cycle output ──
      if (strategy !== _prevStrategy) {
        _prevStrategy = strategy;
        _strategyCycles = 0;

        if (contract) {
          messages.push({ role: "user", content: contract.instruction });
          // Feed previous cycle outputs as context for the new strategy
          if (this._cycleOutputs.length > 0) {
            messages.push({ role: "user", content: `[HASIL SIKLUS SEBELUMNYA]\n${this._cycleOutputs.join("\n\n---\n\n")}` });
          }
        }
      }

      // ── Filter tools per cycle contract ──
      let activeTools = tools;
      if (contract && contract.allowedTools.length > 0) {
        activeTools = tools.filter(t => contract.allowedTools.includes(t.name));
      } else if (contract && contract.allowedTools.length === 0) {
        activeTools = [];
      }

      // ── Validate messages ──
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || typeof m !== "object") throw new Error(`Invalid message at index ${i}`);
        if (!["user", "assistant", "system", "tool"].includes(m.role)) throw new Error(`Invalid role at ${i}: "${m.role}"`);
      }

      // ── LLM Call ──
      const result = await callLLMWithTools(messages, activeTools, maxTokens, false, jsonMode);
      const tokensThisCycle = result.tokensUsed;

      // ── Error: retry with fallback (no tools, smaller prompt) ──
      if (result.status === "error") {
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

      // ── No tool calls → text response ──
      if (result.status === "ok") {
        const content = stripDSML(result.content);
        const validated = validateResponse(content);

        // Contract enforcement: must-use-tools cycles reject text-only responses
        if (contract && contract.mustUseTools && this._toolsUsed === 0) {
          messages.push({ role: "user", content: `[GOVERNOR] Siklus ${strategy} WAJIB menggunakan tools. ${contract.instruction}` });
          continue;
        }

        if (validated.cleanedText) {
          this._cycleOutputs.push(`[${strategy} Cycle ${context.cycle}]\n${validated.cleanedText}`);
          await remember(userId, mode, user, validated.cleanedText);
          context.result = validated.cleanedText;
        }
        this.governor.afterCycle(false, [], tokensThisCycle);
        return validated.cleanedText;
      }

      // ── Execute tool calls ──
      this._toolsUsed += result.toolCalls.length;
      _strategyCycles++;
      const toolResults: any[] = [];
      const toolStatuses: { name: string; durationMs: number; status: "ok" | "error" }[] = [];
      const filePaths: string[] = [];
      let cycleTextOutput = "";

      for (const tc of result.toolCalls) {
        // Contract enforcement: reject disallowed tools
        if (contract && contract.allowedTools.length > 0 && !contract.allowedTools.includes(tc.name)) {
          const msg = `[GOVERNOR] Tool "${tc.name}" DILARANG di siklus ${strategy}. Hanya diperbolehkan: ${contract.allowedTools.join(", ")}.`;
          messages.push({ role: "user", content: msg });
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

      // Capture any text from the assistant message as intermediate output
      if (result.message?.content) {
        const text = stripDSML(result.message.content);
        if (text) {
          cycleTextOutput = text;
          this._cycleOutputs.push(`[${strategy} Cycle ${context.cycle}]\n${text}`);
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

      // Goal progress
      const goalProgress = this.governor.goalTree.progress();

      // ── Budget tracking ──
      const toolChars = toolResults.reduce((s: number, t: any) => s + String(t.content || "").length, 0);
      budgetTracker.recordCycle(
        context.cycle, tokensThisCycle, toolChars,
        this.governor.budget.usage.tokens,
        this.governor.strategyEngine.strategy,
        this.governor.metrics.evidenceQuality,
        this.governor.metrics.confidence,
      );

      // ── MissionIntelligence evaluation ──
      const miResult = missionIntelligence.evaluate({
        evidenceQuality: this.governor.metrics.evidenceQuality,
        confidence: this.governor.metrics.confidence,
        cyclesExecuted: this.governor.metrics.cyclesExecuted,
        strategy: this.governor.strategyEngine.strategy,
        budgetExhausted: this.governor.budget.isExceeded().exceeded,
        goalProgress,
      });

      // ── CONCLUDE: force text-only, feed all previous outputs ──
      if (miResult.decision === "CONCLUDE") {
        // Include ALL intermediate outputs for synthesis
        const ctxFeed = this._cycleOutputs.length > 0
          ? `\n\n[SEMUA HASIL SIKLUS SEBELUMNYA]\n${this._cycleOutputs.join("\n\n---\n\n")}`
          : "";

        messages.push({ role: "user", content: `[GOVERNOR] CONCLUDE. Waktu menyimpulkan.

ATURAN WAJIB:
- JELASKAN ANALISIS, bukan proses. JANGAN tulis "saya membaca file X" atau "saya menjalankan command Y". Sebutkan file dan line number secara langsung dalam analisis.
- JANGAN transkrip penuh log/command output. Ringkas berdasarkan pola.
- JANGAN tulis ulang command yang kamu jalankan.
- DILARANG: frasa seperti "saya menggunakan tools", "saya mencari", "saya menemukan file", "berdasarkan hasil penelusuran".

Berdasarkan SEMUA file dan command output yang sudah kamu baca, buat laporan analisis TEKNIS:

## Root Cause
[JELASKAN penyebab utama. Sebutkan file spesifik + line number.]

## Verified Evidence
[SEBUTKAN file yang SUDAH kamu baca. Format: "[filepath] line [nomor]: [fakta spesifik]"]
[JANGAN GUNAKAN kata: "kemungkinan", "mungkin", "bisa jadi", "diduga".]

## Rekomendasi Teknis
1. [Langkah spesifik]
2. [Langkah spesifik]

## Confidence Justification
Confidence [XX]% karena: [evidence item 1], [evidence item 2]

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
        this.governor.finishExecution(context.contract);
        return validated.cleanedText;
      }

      // ── Evaluate → safety net final call ──
      if (!this.governor.shouldContinue()) {
        const finalText = await this.doFinalCall(messages, tools, maxTokens, userId, mode, user, result.message, jsonMode);
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
