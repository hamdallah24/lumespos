import type { CouncilSession, CorporateDecision, MemoryCategory } from "./types";
import { memoryProvider } from "../../executive-runtime/memory-provider";
import { KnowledgeProvider } from "../../knowledge-platform/providers";

function categorizeSession(session: CouncilSession): MemoryCategory {
  const title = session.title.toLowerCase();
  const reason = session.reason.toLowerCase();
  if (reason.includes("risk") || reason.includes("crisis") || reason.includes("emergency")) return "risk";
  if (reason.includes("fail") || reason.includes("decline") || reason.includes("crash")) return "failure";
  if (reason.includes("expansion") || reason.includes("grow") || reason.includes("new branch")) return "expansion";
  if (reason.includes("finance") || reason.includes("cashflow") || reason.includes("budget") || reason.includes("profit")) return "finance";
  if (reason.includes("people") || reason.includes("hr") || reason.includes("recruitment") || reason.includes("workforce")) return "people";
  if (reason.includes("innov") || reason.includes("improve") || reason.includes("success")) return "success";
  return "strategic";
}

function summarizeSession(session: CouncilSession): string {
  const decisions = session.decisions.map(d => `- ${d.title}: ${d.decision.slice(0, 100)}`).join("\n");
  return `## Council: ${session.title}
Date: ${session.createdAt}
Type: ${session.meetingType}
Status: ${session.status}
Participants: ${session.executives.filter(m => m.present).map(m => m.executive).join(", ")}
Duration: ${session.durationMs ? Math.round(session.durationMs / 60000) + "m" : "N/A"}

### Agenda
${session.agenda.map(a => `- [${a.status}] ${a.title}`).join("\n")}

### Decisions
${decisions || "No decisions"}

### Confidence: ${Math.round(session.confidence * 100)}%
`;
}

export async function feedSessionToMemory(session: CouncilSession): Promise<void> {
  const summary = summarizeSession(session);
  const category = categorizeSession(session);

  try {
    await memoryProvider.write({
      content: summary,
      executive: "Council",
      category,
      scope: "organization",
      source: `council:${session.sessionId}`,
      tags: ["council", session.meetingType, category, `status:${session.status}`],
      confidence: session.confidence,
    });
  } catch { }
}

export async function feedDecisionToMemory(decision: CorporateDecision, session: CouncilSession): Promise<void> {
  try {
    await memoryProvider.write({
      content: `Corporate Decision: ${decision.title}\n${decision.decision}\nReason: ${decision.reasoning.slice(0, 300)}`,
      executive: "Council",
      category: "strategic",
      scope: "organization",
      source: `council:${session.sessionId}:decision:${decision.decisionId}`,
      tags: ["council", "decision", decision.priority, ...decision.executives.map(e => e.toLowerCase())],
      confidence: decision.confidence,
    });
  } catch { }
}

export async function feedSessionToKnowledge(session: CouncilSession): Promise<void> {
  KnowledgeProvider.ingestEpisode({
    eventType: "council_meeting",
    eventId: session.sessionId,
    context: summarizeSession(session).slice(0, 1500),
    outcome: session.status === "FINISHED" ? "success" : "neutral",
    domain: "strategy",
    topic: categorizeSession(session),
    summary: `Council: ${session.title} — ${session.decisions.length} keputusan`,
    tags: ["council", session.meetingType, `status:${session.status}`],
  });
}
