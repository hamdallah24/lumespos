// llm-config bridge tests — resolve through ConfigCenter seeded values,
// with env fallback when the center is not reachable.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLLMConfig, resetLLMConfigCache } from "../../src/ai/llm/llm-config";

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  resetLLMConfigCache();
  for (const k of ["DEEPSEEK_MODEL", "GEMINI_MODEL", "LLM_TEMPERATURE"]) {
    saved[k] = process.env[k];
  }
});

afterEach(() => {
  resetLLMConfigCache();
  for (const k of ["DEEPSEEK_MODEL", "GEMINI_MODEL", "LLM_TEMPERATURE"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getLLMConfig fallback", () => {
  it("reads env fallback when ConfigCenter is not initialized", async () => {
    // Remove env for these keys to test defaults.
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.GEMINI_MODEL;
    const cfg = await getLLMConfig();
    expect(cfg.deepseekModel).toBe("deepseek-chat");
    expect(cfg.geminiModel).toBe("gemini-2.5-flash");
    expect(cfg.temperature).toBe(0.7);
    expect(cfg.maxTokens).toBe(4000);
  });

  it("uses process.env values when set", async () => {
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    const cfg = await getLLMConfig();
    expect(cfg.deepseekModel).toBe("deepseek-v4-flash");
    expect(cfg.geminiModel).toBe("gemini-2.5-flash");
  });
});