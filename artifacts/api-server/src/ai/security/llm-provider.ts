// SPRINT 6: LLM Independence Layer — provider abstraction
// Never callDeepSeek() directly. Use LLMProvider.chat().
// Swap providers without changing business logic.

export interface LLMProvider {
  name: string;
  chat(params: {
    messages: any[];
    maxTokens?: number;
    temperature?: number;
    tools?: any[];
  }): Promise<string>;

  chatWithTools(params: {
    system: string;
    user: string;
    maxTokens?: number;
    tools?: any[];
    onProgress?: (msg: string) => void;
  }): Promise<string>;
}

// ── DeepSeek Adapter ──
import { callDeepSeek, callDeepSeekWithTools } from "../../routes/ai-helpers";

export const deepseekProvider: LLMProvider = {
  name: "DeepSeek",

  async chat(params) {
    const system = (params.messages.find((m: any) => m.role === "system")?.content || "").slice(0, 5000);
    const user = params.messages.filter((m: any) => m.role === "user").map((m: any) => m.content).join("\n").slice(0, 5000);
    // callDeepSeek expects (system, user, userId, mode), we use 0/null for generic calls
    return callDeepSeek(system, user, 0, "chat", params.maxTokens || 800, !!params.tools?.length);
  },

  async chatWithTools(params) {
    return callDeepSeekWithTools(
      params.system, params.user, 0, "cto",
      params.tools as any[] || [], params.maxTokens || 3000,
      params.onProgress,
    );
  },
};

// ── Active provider ──
let _activeProvider: LLMProvider = deepseekProvider;

export function setProvider(provider: LLMProvider) {
  console.log(`[LLMProvider] Switching from ${_activeProvider.name} to ${provider.name}`);
  _activeProvider = provider;
}

export function getProvider(): LLMProvider {
  return _activeProvider;
}

// Component metadata
export const llmProviderSystem = {
  name: "LLMProvider",
  version: "1.0.0",
  capabilities: ["provider-abstraction", "adapter-pattern", "model-independence"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0", custom: { activeProvider: _activeProvider.name } }),
};
