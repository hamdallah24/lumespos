// ECP-040: LLM Adapter — Stateless LLM communication
// Responsibilities: callDeepSeek, callDeepSeekWithTools
// Imports helpers from ai-helpers (memory, tool dispatch, validation).
// No Governor logic here after ECP-040 Commit 4 (loop moves to ExecutionDriver).

import {
  getHistory, remember, executeToolCall, getToolLabel,
} from "../../routes/ai-helpers";
import { ExecutionContext, RuntimeState } from "../runtime/execution-context";
import { ExecutionGovernor } from "../runtime/execution/execution-governor";
import { foundationLoader } from "../runtime/foundation-loader";
import { buildFoundationContext } from "../runtime/context-builder";
import { assembleSystemPrompt } from "../runtime/prompt-assembler";
import { loadKnowledgeWithContent } from "../runtime/knowledge-loader";
import { emit, Events } from "../runtime/events";
import { finalize, errorTrace } from "../runtime/trace";
import {
  stripDSML, parseDSMLToolCalls,
  validateMessageSequence, sanitizeMessages,
  validateResponse,
} from "../runtime/validator";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const TIMEOUT_MS = 45000;

// ── Filter: remove contaminated system-prompt echoes ──
function filterContamination(history: { role: string; content: string }[]) {
  return history.filter(m => {
    if (m.role !== "assistant") return true;
    const c = m.content || "";
    return !/KAMU ADALAH (CEO|CTO) |\[Context Budget:|\[ROLE:/i.test(c.slice(0, 300));
  });
}

/** Single-shot LLM call — no tools, no loop. CEO Runtime (REASONING mode). */
export async function callDeepSeek(
  system: string, user: string, userId: number, mode: string,
  maxTokens = 800, jsonMode = false,
): Promise<string> {
  const key = DEEPSEEK_KEY;
  const base = DEEPSEEK_BASE;
  const model = DEEPSEEK_MODEL;
  if (!key || !base) { console.error("[ai] DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set"); return "ERROR: API key AI belum dikonfigurasi."; }
  try {
    const history = await getHistory(userId, mode);
    const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
    for (const h of history) messages.push(h);
    let userContent = user.slice(0, 3000);
    userContent = userContent.replace(/\b(artifacts\/|\.local\/|lib\/)\S*\.[a-z]{2,4}\b/gi, "[file]");
    messages.push({ role: "user", content: userContent });

    const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally { clearTimeout(tid); }
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
      return `ERROR: AI tidak merespon (HTTP ${resp.status}). ${err.slice(0, 100)}`;
    }
    const json = await resp.json();
    const content = (json as any).choices?.[0]?.message?.content?.trim() || "";
    if (!content) console.error(`[ai] DeepSeek empty response. finish_reason=${(json as any).choices?.[0]?.finish_reason}`);
    else await remember(userId, mode, user, content);
    return content;
  } catch (err) {
    if ((err as any)?.name === "AbortError") { console.error("[ai] DeepSeek timeout"); return "ERROR: Layanan AI tidak merespon (timeout). Coba lagi."; }
    console.error("[ai] callDeepSeek fetch error:", err);
    return `ERROR: Gagal menghubungi AI. ${(err as any)?.message || "Coba lagi."}`;
  }
}

/** Tool-calling LLM loop — Governor governs execution. */
export async function callDeepSeekWithTools(
  system: string, user: string, userId: number, mode: string, tools: any[], maxTokens = 2000,
  onProgress?: (msg: string) => void,
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void,
  stream = false,
  onToken?: (token: string) => void,
  onExecutionEvent?: (snapshot: import("../runtime/execution/execution-manifest").ExecutionSnapshot) => void,
  executionSpec?: { complexity?: string; domain?: string; entities?: string[]; objective?: string },
): Promise<string> {
  const ctx = new ExecutionContext(userId, mode);
  const key = DEEPSEEK_KEY;
  const base = DEEPSEEK_BASE;
  const model = DEEPSEEK_MODEL;
  if (!key || !base) { console.error("[ai] DeepSeek key/base not set"); return ""; }

  const history = await getHistory(userId, mode, 400);
  const filteredHistory = filterContamination(history);
  let systemContent: string;
  if (system.includes("[ASSET:")) {
    systemContent = system.slice(0, 5000);
  } else {
    try {
      const assets = loadKnowledgeWithContent({ strategy: "always" });
      const pkg = buildFoundationContext(assets, mode, 4000);
      systemContent = assembleSystemPrompt(pkg, mode) || system.slice(0, 5000);
    } catch {
      systemContent = system.slice(0, 5000);
    }
  }
  const messages: any[] = [{ role: "system", content: systemContent }];
  for (const h of filteredHistory) messages.push(h);
  ctx.step("MemoryBridge", "load", { historyCount: filteredHistory.length });
  ctx.end("ok");
  ctx.setState(RuntimeState.KNOWLEDGE_LOADING);
  ctx.incMetric("roundCount");
  messages.push({ role: "user", content: user.slice(0, 5000) });

  const toolsPayload = tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));

  const MAX_ROUNDS_LEGACY = 5;

  const governor = new ExecutionGovernor(
    executionSpec?.complexity || "medium",
    executionSpec?.domain || "general",
    executionSpec?.entities || [],
    executionSpec?.objective || user.slice(0, 100),
    onExecutionEvent,
  );

  const logPayload = (label: string, msgs: any[], r: number) => {
    console.log(`[DeepSeek ${label}]`, JSON.stringify({
      cycle: r,
      messageCount: msgs.length,
      messages: msgs.map((m: any) => ({
        role: m.role,
        contentType: typeof m.content,
        contentPreview: JSON.stringify(m.content)?.slice(0, 120),
        tool_call_id: m.tool_call_id ?? null,
        tool_calls: m.tool_calls?.map((tc: any) => ({ id: tc.id, name: tc.function?.name })) ?? null,
      })),
    }, null, 2));
  };

  let round = 0;
  let _prevStrategy = "";

  const EXECUTION_INSTRUCTION: Record<string, string> = {
    EXPLORE: "Continue exploring. Find all relevant files first before analyzing.",
    INVESTIGATE: "Stop exploring. Read the files you found. Do not search again unless necessary.",
    ANALYZE: "Analyze what you have. Only call tools if critical new information is needed.",
    CONCLUDE: "Time to conclude. Provide your final response now. No more tools.",
    ESCALATE: "Cannot proceed with current resources. Report findings and stop.",
  };

  while (governor.shouldContinue()) {
    round = governor.beforeCycle();

    const currentStrategy = governor.strategyEngine.strategy;
    if (currentStrategy !== _prevStrategy) {
      _prevStrategy = currentStrategy;
      const instruction = EXECUTION_INSTRUCTION[currentStrategy];
      if (instruction) {
        messages.push({ role: "user", content: `[GOVERNOR] ${instruction}` });
      }
    }

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m || typeof m !== "object") throw new Error(`Invalid message at index ${i}: not an object`);
      if (!["user", "assistant", "system", "tool"].includes(m.role)) throw new Error(`Invalid role at index ${i}: "${m.role}"`);
      if (m.content === undefined) throw new Error(`message[${i}].content is undefined (role=${m.role})`);
      if (m.tool_calls) {
        for (let j = 0; j < m.tool_calls.length; j++) {
          const tc = m.tool_calls[j];
          if (!tc.id) throw new Error(`message[${i}].tool_calls[${j}].id is empty`);
          if (!tc.function?.name) throw new Error(`message[${i}].tool_calls[${j}].function.name is empty`);
        }
      }
    }

    const cleanMessages = sanitizeMessages(messages);
    validateMessageSequence(cleanMessages);
    logPayload("Request", cleanMessages, round);

    const body: any = { model, messages: cleanMessages, max_tokens: maxTokens, temperature: 0.7, stream };
    if (tools.length > 0) body.tools = toolsPayload;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
    ctx.step("LLMGateway", "fetch", { round: round + 1, msgCount: cleanMessages.length });
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally { clearTimeout(tid); }

    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => "{}");
      let parsedErr: any = {};
      try { parsedErr = JSON.parse(errorBody); } catch { parsedErr = { raw: errorBody }; }
      console.error("[DeepSeek 400 Error]", JSON.stringify({
        status: resp.status,
        errorBody: parsedErr,
        round: round + 1,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
      }, null, 2));
      if (round > 0) {
        throw new Error(`AI engine error at round ${round}/${MAX_ROUNDS_LEGACY}: HTTP ${resp.status}`);
      }
      delete body.tools;
      const retryCtl = new AbortController();
      const retryTid = setTimeout(() => retryCtl.abort(), TIMEOUT_MS);
      let retryResp;
      try {
        retryResp = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
          signal: retryCtl.signal,
        });
      } finally { clearTimeout(retryTid); }
      if (!retryResp.ok) throw new Error(`AI engine error: HTTP ${resp.status}`);
      const rj = await retryResp.json();
      const rc = (rj as any).choices?.[0]?.message?.content?.trim() || "";
      ctx.setState(RuntimeState.REASONING);
      emit(Events.BeforeValidation, { textLength: rc.length });
      ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "raw", timestampMs: 0, metadata: { length: rc.length, preview: rc.slice(0, 120) } });
      const validated = validateResponse(rc);
      ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "cleaned", timestampMs: 0, metadata: { rawLength: rc.length, cleanedLength: validated.cleanedText.length, warnings: validated.warnings.map((w: string) => w.slice(0, 30)) } });
      emit(Events.AfterValidation, { warnings: validated.warnings });
      if (validated.warnings.length > 0) console.warn("[Validator] Retry path warnings:", validated.warnings);
      if (validated.cleanedText) { ctx.setState(RuntimeState.DELIVERY); ctx.addEvent({ state: RuntimeState.DELIVERY, phase: "remembered", timestampMs: 0, metadata: { length: validated.cleanedText.length, saved: true } }); await remember(userId, mode, user, validated.cleanedText); }
      governor.afterCycle(false, [], maxTokens);
      return validated.cleanedText;
    }

    const json = await resp.json();
    const msg = (json as any).choices?.[0]?.message;
    if (!msg) return "";

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const rawContent = msg.content?.trim() || "";
      const dsmlTools = parseDSMLToolCalls(rawContent);
      if (dsmlTools) {
        msg.tool_calls = dsmlTools;
      } else {
        const content = stripDSML(rawContent);
        ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "raw", timestampMs: 0, metadata: { length: content.length, preview: content.slice(0, 120) } });
        const validated = validateResponse(content);
        ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "cleaned", timestampMs: 0, metadata: { rawLength: content.length, cleanedLength: validated.cleanedText.length, warnings: validated.warnings.map((w: string) => w.slice(0, 30)) } });
        if (validated.warnings.length > 0) emit(Events.AfterValidation, { warnings: validated.warnings });
        if (validated.cleanedText) { ctx.setState(RuntimeState.DELIVERY); ctx.addEvent({ state: RuntimeState.DELIVERY, phase: "remembered", timestampMs: 0, metadata: { length: validated.cleanedText.length, saved: true } }); await remember(userId, mode, user, validated.cleanedText); }
        return validated.cleanedText;
      }
    }

    ctx.setState(RuntimeState.TOOL_EXECUTION);
    const toolResults: any[] = [];
    for (const tc of msg.tool_calls) {
      if (!tc.id) throw new Error(`tool_call_id missing for tool: ${tc.function?.name}`);
      const fn = tc.function;
      let args: Record<string, any> = {};
      try { args = JSON.parse(fn.arguments); } catch { args = {}; }
      const label = getToolLabel(fn.name);
      if (onProgress) onProgress(label);
      if (onTool) onTool({ name: fn.name, status: "started" });
      try {
        const t0 = Date.now();
        const r = await executeToolCall(fn.name, args);
        const dur = Date.now() - t0;
        emit(Events.ToolExecuted, { name: fn.name, durationMs: dur });
        if (onTool) onTool({ name: fn.name, status: "completed", durationMs: dur });
        ctx.tool(fn.name, dur);
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: String(r || "(no output)").slice(0, 2000),
        });
      } catch (toolErr: any) {
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `Error: ${toolErr.message || "tool failed"}`,
        });
      }
    }

    messages.push(msg, ...toolResults);

    const actuallyHasTools = !!(msg.tool_calls && msg.tool_calls.length > 0);
    governor.afterCycle(actuallyHasTools, msg.tool_calls.map((tc: any) => ({
      name: tc.function?.name || "unknown",
      durationMs: 0,
    })), 500);

    if (!governor.shouldContinue()) {
      const doFinalCall = async (withTools: boolean): Promise<string> => {
        const clean = sanitizeMessages(messages);
        validateMessageSequence(clean);
        logPayload("FinalCall", clean, MAX_ROUNDS_LEGACY - 1);
        const fb: any = { model, messages: clean, max_tokens: 8000, temperature: 0.7 };
        if (withTools) fb.tools = toolsPayload;
        const fc = new AbortController();
        const ft = setTimeout(() => fc.abort(), TIMEOUT_MS);
        let fr;
        try {
          fr = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify(fb),
            signal: fc.signal,
          });
        } finally { clearTimeout(ft); }
        if (!fr.ok) {
          const errText = await fr.text().catch(() => "{}");
          let errParsed: any = {};
          try { errParsed = JSON.parse(errText); } catch { errParsed = { raw: errText }; }
          console.error("[DeepSeek 400 FinalCall]", JSON.stringify({
            status: fr.status, errorBody: errParsed,
            messageCount: clean.length,
            lastMessage: clean[clean.length - 1],
          }, null, 2));
          throw new Error(`AI engine error at final round: HTTP ${fr.status}: ${JSON.stringify(errParsed)}`);
        }
        const fj = await fr.json();
        const fmsg = (fj as any).choices?.[0]?.message;
        if (fmsg?.tool_calls?.length > 0 && withTools) {
          const { tool_calls, ...rest } = fmsg;
          messages.push(rest);
          return doFinalCall(false);
        }
        const fc2 = stripDSML(fmsg?.content?.trim() || "");
        const fallback = stripDSML(msg.content?.trim() || "");
        const finalContent = fc2 || fallback;
        ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "raw", timestampMs: 0, metadata: { length: finalContent.length, preview: finalContent.slice(0, 120) } });
        const validated = validateResponse(finalContent);
        ctx.addEvent({ state: RuntimeState.VALIDATION, phase: "cleaned", timestampMs: 0, metadata: { rawLength: finalContent.length, cleanedLength: validated.cleanedText.length, warnings: validated.warnings.map((w: string) => w.slice(0, 30)) } });
        if (validated.warnings.length > 0) {
          console.warn("[Validator] Safety net warnings:", validated.warnings);
          emit(Events.AfterValidation, { warnings: validated.warnings });
        }
        if (validated.cleanedText) { ctx.setState(RuntimeState.DELIVERY); ctx.addEvent({ state: RuntimeState.DELIVERY, phase: "remembered", timestampMs: 0, metadata: { length: validated.cleanedText.length, saved: true } }); await remember(userId, mode, user, validated.cleanedText); }
        return validated.cleanedText;
      };
      return doFinalCall(true);
    }
  }

  finalize(ctx);
  return "";
}
