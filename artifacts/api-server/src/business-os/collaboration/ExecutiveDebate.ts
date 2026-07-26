import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface DebateArgument {
  id: string;
  executive: string;
  position: "support" | "oppose" | "neutral";
  statement: string;
  reasoning: string;
  evidence: string;
  risks: string[];
  confidence: number;
  timestamp: string;
}

export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  arguments: DebateArgument[];
  status: "open" | "closed" | "decided";
  decidedAt?: string;
  decision?: string;
  createdAt: string;
}

export class ExecutiveDebate {
  private topics: Map<string, DebateTopic> = new Map();

  openDebate(title: string, description: string, proposedBy: string): DebateTopic {
    const topic: DebateTopic = {
      id: `debate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description,
      proposedBy,
      arguments: [],
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.topics.set(topic.id, topic);
    return topic;
  }

  submitArgument(
    topicId: string,
    executive: string,
    position: "support" | "oppose" | "neutral",
    statement: string,
    reasoning: string,
    evidence: string,
    risks: string[],
    confidence: number,
  ): DebateArgument | null {
    const topic = this.topics.get(topicId);
    if (!topic || topic.status !== "open") return null;

    const arg: DebateArgument = {
      id: `arg-${Date.now()}-${topic.arguments.length + 1}`,
      executive,
      position,
      statement,
      reasoning,
      evidence,
      risks,
      confidence,
      timestamp: new Date().toISOString(),
    };
    topic.arguments.push(arg);
    ExecutiveWorkspaceManager.recordDiscussion(executive, `Debate: ${topic.title}`, `${position}: ${statement}`);
    return arg;
  }

  closeDebate(topicId: string, decision: string): boolean {
    const topic = this.topics.get(topicId);
    if (!topic) return false;
    topic.status = "decided";
    topic.decision = decision;
    topic.decidedAt = new Date().toISOString();
    return true;
  }

  getTopic(topicId: string): DebateTopic | undefined {
    return this.topics.get(topicId);
  }

  getOpenTopics(): DebateTopic[] {
    return [...this.topics.values()].filter(t => t.status === "open");
  }

  getTopicsByExecutive(executive: string): DebateTopic[] {
    return [...this.topics.values()].filter(t => t.arguments.some(a => a.executive === executive));
  }

  getAllTopics(): DebateTopic[] {
    return [...this.topics.values()];
  }

  summarize(topicId: string): string {
    const topic = this.topics.get(topicId);
    if (!topic) return "Topic not found";

    const supports = topic.arguments.filter(a => a.position === "support");
    const opposes = topic.arguments.filter(a => a.position === "oppose");
    const neutrals = topic.arguments.filter(a => a.position === "neutral");

    const lines: string[] = [];
    lines.push(`Debate: ${topic.title}`);
    lines.push(`Proposed by: ${topic.proposedBy}`);
    lines.push(`Status: ${topic.status}${topic.decision ? ` → ${topic.decision}` : ""}`);
    lines.push("─".repeat(50));

    if (supports.length > 0) {
      lines.push("\nSUPPORT:");
      for (const a of supports) {
        lines.push(`  ${a.executive} (${(a.confidence * 100).toFixed(0)}%): ${a.statement}`);
        lines.push(`    Reasoning: ${a.reasoning}`);
      }
    }

    if (opposes.length > 0) {
      lines.push("\nOPPOSE:");
      for (const a of opposes) {
        lines.push(`  ${a.executive} (${(a.confidence * 100).toFixed(0)}%): ${a.statement}`);
        lines.push(`    Reasoning: ${a.reasoning}`);
        if (a.risks.length > 0) lines.push(`    Risks: ${a.risks.join(", ")}`);
      }
    }

    if (neutrals.length > 0) {
      lines.push("\nNEUTRAL:");
      for (const a of neutrals) {
        lines.push(`  ${a.executive}: ${a.statement}`);
      }
    }

    const avgConfidence = topic.arguments.reduce((s, a) => s + a.confidence, 0) / (topic.arguments.length || 1);
    lines.push(`\nAverage Confidence: ${(avgConfidence * 100).toFixed(0)}%`);

    return lines.join("\n");
  }
}
