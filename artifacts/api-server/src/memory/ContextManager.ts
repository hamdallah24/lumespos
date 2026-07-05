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

    // Summarize older messages
    if (older.length > 0) {
      const summary = this.summarizeMessages(older);
      return [...systemMsg, { role: "system", content: summary }, ...recent];
    }

    return [...systemMsg, ...recent];
  }

  /** Artifact Compression: replace long tool output with brief summary */
  compressToolOutput(output: string, maxLen: number = 800): string {
    if (output.length <= maxLen) return output;

    const lines = output.split("\n").filter(l => l.trim());
    const head = lines.slice(0, 3).join("\n");
    const tail = lines.slice(-2).join("\n");
    const totalLines = lines.length;

    return `${head}\n... [${totalLines - 5} lines truncated, ${output.length} chars total] ...\n${tail}`;
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
