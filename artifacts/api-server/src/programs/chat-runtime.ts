// ECP-018: Chat Runtime — casual conversation only
// Foundation v2.0 compliant. NO directive (Chat is not an executive).
// Small runtime: Memory → PromptAssembler → LLM (500 tokens).

import { getIdentity } from "../ai/runtime/identity";
import { assemble } from "../ai/runtime/prompt-assembler";
import { callDeepSeek } from "../routes/ai-helpers";

const CHAT_IDENTITY = getIdentity("Chat")!;

interface ChatTask {
  message: string;
  userId: number;
}

interface ChatResult {
  success: boolean;
  text: string;
  pipeline: string[];
}

async function execute(task: ChatTask): Promise<ChatResult> {
  const pipeline: string[] = [];

  // Stage 1: Identity
  pipeline.push("Identity");

  // Stage 2: Fast path for simple greetings
  const lower = task.message.toLowerCase().trim();
  if (/^(halo|hai|hi|hey|test|ok|p|thanks|makasih)$/i.test(lower)) {
    pipeline.push("DirectResponse");
    return { success: true, text: "Halo. Ada yang bisa dibantu?", pipeline };
  }
  if (/apa kabar/i.test(lower)) {
    pipeline.push("DirectResponse");
    return { success: true, text: "Baik. Terima kasih sudah bertanya. Ada yang bisa saya bantu?", pipeline };
  }

  // Stage 3: Prompt Assembly (no directive — Chat is not executive)
  pipeline.push("PromptAssembly");
  const systemPrompt = assemble({
    identity: CHAT_IDENTITY,
    directive: "",  // No directive for Chat
    outputSchema: "Balas maksimal 500 karakter. Bahasa Indonesia santai. Jangan teknis kecuali diminta.",
    maxTokens: 500,
    mode: "chat",
  });

  // Stage 4: LLM
  pipeline.push("LLM");
  const text = await callDeepSeek(systemPrompt, task.message, task.userId, "chat", 500);
  pipeline.push("ChatResponse");

  return {
    success: !text.startsWith("ERROR:"),
    text: text || "Chat sedang sibuk, coba lagi ya.",
    pipeline,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
  };
}

export const chatRuntime = {
  name: "ChatRuntime",
  version: "1.0.0",
  capabilities: ["conversation", "greetings", "simple-queries"],
  dependencies: ["PromptAssembler", "LLM"],
  health,
  execute,
};

export default chatRuntime;
