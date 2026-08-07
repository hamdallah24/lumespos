// ConfigCenter → LLM Adapter config bridge.
// Runtime reads for the stateless LLM adapter resolve through the ConfigCenter
// ConfigReader (which is seeded from env at boot), with a direct process.env
// fallback for any bootstrap window where the ConfigCenter is not yet up.
// No adapter logic lives here — only read-through + cache + invalidation.

import { getConfigCenter } from "../../settings";

export interface LLMConfig {
  deepseekKey?: string;
  deepseekBase?: string;
  deepseekModel: string;
  geminiKey?: string;
  geminiModel: string;
  defaultProvider: string;
  temperature: number;
  maxTokens: number;
}

// Read env at call time so tests and late-configuration are reflected.
function envFallback(): LLMConfig {
  return {
    deepseekKey: process.env.DEEPSEEK_API_KEY,
    deepseekBase: process.env.DEEPSEEK_BASE_URL,
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    geminiKey: process.env.GOOGLE_GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER || "deepseek",
    temperature: Number(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: Number(process.env.LLM_MAX_TOKENS) || 4000,
  };
}

let cached: LLMConfig | null = null;
let subscribed = false;

/** Test hook — drop the cached resolved config. */
export function resetLLMConfigCache(): void {
  cached = null;
}

// Invalidate on every config commit so a Settings-UI change is honored promptly.
function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    const center = getConfigCenter();
    center.bus.on("llm-config-bridge", () => {
      cached = null;
    });
  } catch {
    // ConfigCenter not initialized yet — cache stays valid via fallback.
  }
}

async function readFromCenter<T>(key: string, fallback: T): Promise<T> {
  try {
    const center = getConfigCenter();
    const resolved = await center.sdk.get(key, {});
    if (resolved && resolved.value !== undefined && resolved.value !== null && resolved.value !== "") {
      return resolved.value as T;
    }
  } catch {
    // fall through
  }
  return fallback;
}

/**
 * Resolve the current LLM provider config through ConfigCenter (env-seeded),
 * falling back to process.env if the center is unavailable.
 */
export async function getLLMConfig(): Promise<LLMConfig> {
  ensureSubscribed();
  if (cached) return cached;
  const fb = envFallback();
  const cfg: LLMConfig = {
    deepseekKey: await readFromCenter("providers.deepseek.apiKey", fb.deepseekKey),
    deepseekBase: await readFromCenter("providers.deepseek.baseUrl", fb.deepseekBase),
    deepseekModel: await readFromCenter("providers.deepseek.model", fb.deepseekModel),
    geminiKey: await readFromCenter("providers.gemini.apiKey", fb.geminiKey),
    geminiModel: await readFromCenter("providers.gemini.model", fb.geminiModel),
    defaultProvider: await readFromCenter("providers.defaultProvider", fb.defaultProvider),
    temperature: await readFromCenter("providers.temperature", fb.temperature),
    maxTokens: await readFromCenter("providers.maxTokens", fb.maxTokens),
  };
  cached = cfg;
  return cfg;
}