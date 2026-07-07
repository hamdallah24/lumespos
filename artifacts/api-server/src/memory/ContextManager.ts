// ADR-010 Phase 2: Context Manager
// Sliding History + Artifact Compression + Executive Memory.
// Reduces prompt growth by 50-70%. Extension above Foundation.

type ChatMessage = { role: string; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string };

export interface ExecutiveMemoryEntry {
  executive: string;
  objective: string;
  currentFindings: string[];
  pendingTasks: string[];
  completedTasks: string[];
  confidence: number;
  lastUpdated: string;
}

export class ContextManager {
  private executiveMemories: Map<string, ExecutiveMemoryEntry> = new Map();

  /** Sliding History: keep system + last N messages + summary of older messages */
  compressHistory(messages: ChatMessage[], keepRecent: number = 12): ChatMessage[] {
    if (messages.length <= keepRecent) return messages;

    const systemMsg = messages.filter(m => m.role === "system");
    const recent = messages.slice(-keepRecent);
    const older = messages.slice(systemMsg.length, -keepRecent);

    // Collect tool_call_ids from recent assistant messages (so we can keep their tool responses)
    const recentToolCallIds = new Set<string>();
    for (const m of recent) {
      if (m.role === "assistant" && m.tool_calls) {
        for (const tc of m.tool_calls) recentToolCallIds.add(tc.id || tc.tool_call_id || "");
      }
    }

    // Remove orphaned tool responses (no matching tool_call_id in recent)
    const filtered = recent.filter(m => {
      if (m.role !== "tool") return true;
      return m.tool_call_id && recentToolCallIds.has(m.tool_call_id);
    });

    // Summarize older messages
    if (older.length > 0) {
      const summary = this.summarizeMessages(older);
      return [...systemMsg, { role: "system", content: summary }, ...filtered];
    }

    return [...systemMsg, ...filtered];
  }

  /** Artifact Compression: replace long tool output with brief summary */
  compressToolOutput(output: string, maxLen: number = 8000): string {
    if (output.length <= maxLen) return output;

    // Heavy compression for command outputs (pm2 logs, cat, etc.)
    if (output.length > 10000) {
      const lines = output.split("\n").filter(l => l.trim());
      return `[Compressed: ${output.length} chars, ${lines.length} lines]\n`
        + lines.slice(0, 40).join("\n")
        + `\n... [${lines.length - 80} lines omitted] ...\n`
        + lines.slice(-40).join("\n");
    }

    const lines = output.split("\n").filter(l => l.trim());
    const head = lines.slice(0, 10).join("\n");
    const tail = lines.slice(-10).join("\n");
    const totalLines = lines.length;

    return `${head}\n... [${totalLines - 20} lines truncated, ${output.length} chars total] ...\n${tail}`;
  }

  /** Executive Memory: get or create compact memory for an executive */
  getMemory(executive: string): ExecutiveMemoryEntry {
    const existing = this.executiveMemories.get(executive);
    if (existing) return existing;

    const entry: ExecutiveMemoryEntry = {
      executive,
      objective: "",
      currentFindings: [],
      pendingTasks: [],
      completedTasks: [],
      confidence: 50,
      lastUpdated: new Date().toISOString(),
    };
    this.executiveMemories.set(executive, entry);
    return entry;
  }

  /** Update executive memory after a cycle */
  updateMemory(executive: string, updates: Partial<ExecutiveMemoryEntry>): void {
    const mem = this.getMemory(executive);
    Object.assign(mem, updates, { lastUpdated: new Date().toISOString() });
  }

  /** Generate compact memory prompt for inclusion in system message */
  buildMemoryPrompt(executive: string): string {
    const mem = this.getMemory(executive);
    if (mem.currentFindings.length === 0 && mem.completedTasks.length === 0) return "";

    return [
      `\n## Executive Memory (${executive})`,
      `Objective: ${mem.objective || "ongoing"}`,
      mem.currentFindings.length > 0 ? `Findings: ${mem.currentFindings.join("; ")}` : "",
      mem.completedTasks.length > 0 ? `Completed: ${mem.completedTasks.join(", ")}` : "",
      `Confidence: ${mem.confidence}%`,
    ].filter(Boolean).join("\n");
  }

  private summarizeMessages(messages: ChatMessage[]): string {
    const userMsgs = messages.filter(m => m.role === "user" && !m.content?.startsWith("[GOVERNOR]"));
    const toolNames = messages
      .filter(m => m.role === "tool")
      .map(m => m.name || "tool")
      .filter((v, i, a) => a.indexOf(v) === i);

    return [
      "\n## Conversation Summary",
      `Previous exchanges: ${userMsgs.length} messages`,
      `Tools used: ${toolNames.length > 0 ? toolNames.join(", ") : "none"}`,
      `Context has been compressed to save tokens. Focus on current task.`,
    ].join("\n");
  }
}

export const contextManager = new ContextManager();
