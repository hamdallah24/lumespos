// ECP-027: Runtime Memory Manager — wraps existing memory functions
// Provides typed memory entries. DB-backed via existing ai-helpers.ts.

import type { MemoryEntry, ConversationSummary } from "./context-types";
import { getHistory } from "../../../services/ai-memory-service";

export async function getRecentDecisions(userId: number, mode: string, limit = 10): Promise<MemoryEntry[]> {
  try {
    const history = await getHistory(userId, mode);
    const decisions: MemoryEntry[] = [];
    let count = 0;

    for (const msg of [...history].reverse()) {
      if (msg.role !== "assistant") continue;
      decisions.push({
        id: `decision-${count}`,
        role: mode,
        type: "decision",
        content: msg.content.slice(0, 500),
        timestamp: new Date().toISOString(),
        priority: count < 3 ? "high" : "normal",
      });
      count++;
      if (count >= limit) break;
    }

    return decisions;
  } catch {
    return [];
  }
}

export async function summarizeConversation(userId: number, mode: string): Promise<ConversationSummary> {
  try {
    const history = await getHistory(userId, mode);

    const summary: ConversationSummary = {
      decisions: [],
      constraints: [],
      openQuestions: [],
      keyFindings: [],
    };

    for (const msg of history) {
      if (msg.role !== "assistant" || !msg.content) continue;
      const content = msg.content.toLowerCase();

      if (content.includes("rekomendasi") || content.includes("decision") || content.includes("putus")) {
        summary.decisions.push(msg.content.slice(0, 200));
        if (summary.decisions.length >= 5) break;
      }
      if (content.includes("constraint") || content.includes("batasan") || content.includes("limitasi")) {
        summary.constraints.push(msg.content.slice(0, 200));
        if (summary.constraints.length >= 5) break;
      }
    }

    return summary;
  } catch {
    return { decisions: [], constraints: [], openQuestions: [], keyFindings: [] };
  }
}
