// SPRINT 2: LLM Gateway — DeepSeek API abstraction
// Extracted from ai-helpers.ts callDeepSeekWithTools
import { callDeepSeekWithTools } from "../ai-helpers";

export const LLM_GATEWAY_VERSION = "1.0.0";

/** Send messages to DeepSeek API, return raw response JSON */
export async function fetchDeepSeekCompletion(
  messages: any[],
  options: {
    model: string;
    base: string;
    key: string;
    maxTokens: number;
    tools?: any[];
    timeoutMs?: number;
  }
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: any }> {
  const { model, base, key, maxTokens, tools, timeoutMs = 30000 } = options;
  const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
  if (tools?.length) body.tools = tools;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
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
    return { ok: false, status: resp.status, error: errorBody };
  }
  const data = await resp.json();
  return { ok: true, data };
}

// Export as component with metadata for registry
export const llmGateway = {
  name: "LLMGateway",
  version: LLM_GATEWAY_VERSION,
  capabilities: ["deepseek-api-call", "timeout-management"],
  dependencies: [],
  execute: callDeepSeekWithTools,
};
