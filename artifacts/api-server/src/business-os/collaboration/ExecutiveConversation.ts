import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface ConversationMessage {
  id: string;
  executive: string;
  role: string;
  message: string;
  confidence: number;
  context: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationThread {
  id: string;
  topic: string;
  initiator: string;
  messages: ConversationMessage[];
  status: "active" | "resolved" | "archived";
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

export class ExecutiveConversation {
  private threads: Map<string, ConversationThread> = new Map();

  startThread(topic: string, initiator: string, initialMessage: string, context: string): ConversationThread {
    const thread: ConversationThread = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      topic,
      initiator,
      messages: [{
        id: `msg-${Date.now()}-1`,
        executive: initiator,
        role: "initiator",
        message: initialMessage,
        confidence: 1.0,
        context,
        timestamp: new Date().toISOString(),
      }],
      status: "active",
      createdAt: new Date().toISOString(),
    };
    this.threads.set(thread.id, thread);
    ExecutiveWorkspaceManager.recordDiscussion(initiator, initialMessage, "");
    return thread;
  }

  addMessage(threadId: string, executive: string, message: string, context: string, confidence: number): ConversationMessage | null {
    const thread = this.threads.get(threadId);
    if (!thread || thread.status !== "active") return null;

    const msg: ConversationMessage = {
      id: `msg-${Date.now()}-${thread.messages.length + 1}`,
      executive,
      role: "participant",
      message,
      confidence,
      context,
      timestamp: new Date().toISOString(),
    };
    thread.messages.push(msg);
    ExecutiveWorkspaceManager.recordDiscussion(executive, message, "");
    return msg;
  }

  resolveThread(threadId: string, resolution: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    thread.status = "resolved";
    thread.resolution = resolution;
    thread.resolvedAt = new Date().toISOString();
    return true;
  }

  getThread(threadId: string): ConversationThread | undefined {
    return this.threads.get(threadId);
  }

  getActiveThreads(): ConversationThread[] {
    return [...this.threads.values()].filter(t => t.status === "active");
  }

  getThreadsByExecutive(executive: string): ConversationThread[] {
    return [...this.threads.values()].filter(t => t.messages.some(m => m.executive === executive));
  }

  getAllThreads(): ConversationThread[] {
    return [...this.threads.values()];
  }

  formatTranscript(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) return "Thread not found";

    const lines: string[] = [];
    lines.push(`Topic: ${thread.topic} (Started by ${thread.initiator})`);
    lines.push(`Status: ${thread.status}${thread.resolution ? ` — ${thread.resolution}` : ""}`);
    lines.push("─".repeat(50));

    for (const msg of thread.messages) {
      lines.push(`${msg.executive} [${msg.confidence.toFixed(2)}]: ${msg.message}`);
      lines.push(`  Context: ${msg.context.slice(0, 80)}`);
      lines.push("");
    }

    return lines.join("\n");
  }
}
