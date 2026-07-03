// ECP-027: Context Assembler — single entry point for all context
// Integrates Foundation Provider + Memory + Mission into one context package.
// Runtime calls this, not individual sources.

import type { ContextSource, ContextPackage, MissionContext } from "./context-types";
import { buildPackage, compress } from "./context-budget";
import { getRecentDecisions, summarizeConversation } from "./runtime-memory-manager";
import { getFoundationProvider } from "../foundation";

interface AssemblyInput {
  userId: number;
  mode: string;
  message: string;
  maxTokens?: number;
  mission?: MissionContext | null;
}

export async function assemble(input: AssemblyInput): Promise<ContextPackage> {
  const provider = getFoundationProvider();
  const maxTokens = input.maxTokens || 4000;
  const sources: ContextSource[] = [];

  // Source 1: Foundation Directive (always)
  const directive = provider.getDirective(input.mode.toUpperCase()) || "";
  if (directive) {
    sources.push({
      name: "Directive",
      priority: 100,
      maxTokens: 500,
      always: true,
      content: () => directive.slice(0, 2000),
    });
  }

  // Source 2: Governance gates (always)
  sources.push({
    name: "Governance",
    priority: 95,
    maxTokens: 200,
    always: true,
    content: () => {
      const gates = provider.governance().getConfidenceGates();
      return `Confidence gates: stop=${gates.stop}, warn=${gates.warn}, execute=${gates.execute}`;
    },
  });

  // Source 3: Mission context (if available)
  if (input.mission) {
    sources.push({
      name: "Mission",
      priority: 90,
      maxTokens: 800,
      always: false,
      content: () => {
        const m = input.mission!;
        return `Mission ${m.id}: ${m.title} (${m.status})\nObjective: ${m.objective}\nProgress: ${m.progress}%\nGoals: ${m.completedGoals.length}/${m.completedGoals.length + m.activeGoals.length}`;
      },
    });
  }

  // Source 4: Runtime memory (recent decisions)
  const decisions = await getRecentDecisions(input.userId, input.mode, 5);
  if (decisions.length > 0) {
    sources.push({
      name: "Memory",
      priority: 70,
      maxTokens: 600,
      always: false,
      content: () => decisions.map(d => `[${d.type}] ${d.content.slice(0, 200)}`).join("\n"),
    });
  }

  // Source 5: Conversation summary
  const conversation = await summarizeConversation(input.userId, input.mode);
  if (conversation.decisions.length > 0 || conversation.constraints.length > 0) {
    sources.push({
      name: "Conversation",
      priority: 50,
      maxTokens: 500,
      always: false,
      content: () => {
        const parts: string[] = [];
        if (conversation.decisions.length > 0) parts.push(`Decisions: ${conversation.decisions.slice(0, 3).join("; ")}`);
        if (conversation.constraints.length > 0) parts.push(`Constraints: ${conversation.constraints.slice(0, 3).join("; ")}`);
        return parts.join("\n");
      },
    });
  }

  // Source 6: User message (always)
  sources.push({
    name: "UserMessage",
    priority: 100,
    maxTokens: 1000,
    always: true,
    content: () => `Founder: ${compress(input.message, 1000)}`,
  });

  return buildPackage(sources, maxTokens);
}

export async function assemblePrompt(input: AssemblyInput): Promise<string> {
  const pkg = await assemble(input);
  return pkg.sources
    .map(s => `[${s.name}]\n${compress(s.content(), s.maxTokens)}`)
    .join("\n\n");
}
