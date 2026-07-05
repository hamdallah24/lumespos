// FOUNDATION FILE — Modification Policy: Only bug fixes. ADR Required. Owner: CTO.
// ECP-040: LLM Adapter — Stateless LLM communication
// Responsibilities: callDeepSeek, callDeepSeekWithTools (compat wrapper),
// callLLMWithTools (stateless single request).
// NO Governor. NO lifecycle. NO policy. NO tool decisions.

import {
  getHistory, remember,
} from "../../services/ai-memory-service";
import { ExecutionContext, RuntimeState } from "../runtime/execution-context";
import { ExecutionPipeline } from "../runtime/execution/execution-pipeline";
import { buildFoundationContext } from "../runtime/context-builder";
import { assembleSystemPrompt } from "../runtime/prompt-assembler";
import { loadKnowledgeWithContent } from "../runtime/knowledge-loader";
import { finalize } from "../runtime/trace";
import {
  parseDSMLToolCalls,
  validateMessageSequence, sanitizeMessages,
} from "../runtime/validator";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const TIMEOUT_MS = 45000;

interface LLMToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

interface LLMResult {
  message: any;
  content: string;
  toolCalls: LLMToolCall[];
  tokensUsed: number;
  status: "ok" | "tool_calls" | "error";
  errorStatus?: number;
}

// ── Filter: remove contaminated system-prompt echoes ──
function filterContamination(history: { role: string; content: string }[]) {
  return history.filter(m => {
    if (m.role !== "assistant") return true;
    const c = m.content || "";
    return !/KAMU ADALAH (CEO|CTO) |\[Context Budget:|\[ROLE:/i.test(c.slice(0, 300));
  });
}

/** Stateless single request to DeepSeek. ONE round trip. NO Governor, NO loop. */
export async function callLLMWithTools(
  messages: any[],
  tools: { name: string; description: string; parameters: Record<string, any> }[],
  maxTokens = 2000,
  stream = false,
  jsonMode = false,
  onToken?: (token: string) => void,
): Promise<LLMResult> {
  const key = DEEPSEEK_KEY;
  const base = DEEPSEEK_BASE;
  const model = DEEPSEEK_MODEL;
  if (!key || !base) return { message: null, content: "", toolCalls: [], tokensUsed: 0, status: "error", errorStatus: 500 };

  const clean = sanitizeMessages(messages);
  validateMessageSequence(clean);

  const toolsPayload = tools.map(t => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const body: any = { model, messages: clean, max_tokens: maxTokens, temperature: 0.7, stream };
  if (jsonMode) body.response_format = { type: "json_object" };
  if (tools.length > 0) body.tools = toolsPayload;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
    console.error(`[ai] DeepSeek HTTP ${resp.status}`);
    return { message: null, content: "", toolCalls: [], tokensUsed: 0, status: "error", errorStatus: resp.status };
  }

  const json = await resp.json();
  const msg = (json as any).choices?.[0]?.message;
  if (!msg) return { message: null, content: "", toolCalls: [], tokensUsed: 0, status: "error", errorStatus: 500 };

  const usage = (json as any).usage;
  const tokensUsed = usage?.total_tokens || usage?.completion_tokens || 500;

  // ── LLM Token Trace ──
  console.log("[LLM-TOKEN]", JSON.stringify({
    finish_reason: (json as any).choices?.[0]?.finish_reason,
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
  }));

  if (!msg.tool_calls || msg.tool_calls.length === 0) {
    const rawContent = msg.content?.trim() || "";
    const dsmlTools = parseDSMLToolCalls(rawContent);
    if (dsmlTools) {
      return {
        message: msg, content: rawContent, tokensUsed,
        toolCalls: dsmlTools.map((tc: any) => ({
          id: tc.id, name: tc.function?.name || "unknown",
          args: JSON.parse(tc.function?.arguments || "{}"),
        })),
        status: "tool_calls",
      };
    }
    return { message: msg, content: rawContent, toolCalls: [], tokensUsed, status: "ok" };
  }

  return {
    message: msg, content: msg.content?.trim() || "", tokensUsed,
    toolCalls: msg.tool_calls.map((tc: any) => ({
      id: tc.id, name: tc.function?.name || "unknown",
      args: JSON.parse(tc.function?.arguments || "{}"),
    })),
    status: "tool_calls",
  };
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
    const maxSystemChars = mode === "ceo" ? 12000 : 4000;
    const messages: any[] = [{ role: "system", content: system.slice(0, maxSystemChars) }];
    for (const h of history) messages.push(h);
    console.log("[CEO-LLM-CALL]", JSON.stringify({
      mode,
      systemLen: system.length,
      slicedTo: maxSystemChars,
      actualSent: system.slice(0, maxSystemChars).length,
      hasExecResults: system.includes("## Executive Results"),
      historyLen: history.length,
      maxTokens,
    }));
    let userContent = user.slice(0, 3000);
    userContent = userContent.replace(/\b(artifacts\/|\.local\/|lib\/)\S*\.[a-z]{2,4}\b/gi, "[file]");
    messages.push({ role: "user", content: userContent });

    const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const tout = mode === "ceo" ? 120000 : 30000;
    const tid = setTimeout(() => controller.abort(), tout);
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

/** Compatibility wrapper — delegates to ExecutionPipeline/Driver.
 *  Signature unchanged for all existing consumers. */
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
  if (!DEEPSEEK_KEY || !DEEPSEEK_BASE) { console.error("[ai] DeepSeek key/base not set"); return ""; }

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

  // Delegate entire lifecycle to ExecutionPipeline → Driver
  console.log("[CTO-DISPATCH]", JSON.stringify({
    systemLen: systemContent.length,
    historyLen: filteredHistory.length,
    msgLen: user.slice(0, 5000).length,
    toolsCount: tools.length,
    model: DEEPSEEK_MODEL,
  }));
  const result = await ExecutionPipeline.execute(
    { role: "CTO" },
    messages, tools, maxTokens, userId, mode, user,
    false,
    { onProgress, onTool, onExecutionEvent },
    executionSpec,
  );

  finalize(ctx);
  return result.text || "";
}
