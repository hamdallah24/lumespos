import type { CouncilSession, CouncilSummaryData, CouncilAgendaItem, CorporateDecision } from "./types";

export function generateMeetingMinutes(session: CouncilSession): CouncilSummaryData {
  const agendaResolved = session.agenda.filter(a => a.status === "resolved").length;
  const duration = session.durationMs ? formatDuration(session.durationMs) : "N/A";
  const actionItems: CouncilSummaryData["actionItems"] = [];

  for (const decision of session.decisions) {
    if (decision.executionPlan) {
      for (const plan of decision.executionPlan) {
        actionItems.push({ action: plan.action, responsible: plan.responsible, dueDate: plan.dueDate });
      }
    }
  }

  return {
    sessionId: session.sessionId,
    title: session.title,
    date: session.createdAt,
    duration,
    participants: session.executives.filter(m => m.present).map(m => m.executive),
    agendaCount: session.agenda.length,
    resolvedCount: agendaResolved,
    decisions: session.decisions.map(d => ({ title: d.title, decision: d.decision.slice(0, 200), confidence: d.confidence })),
    keyRisks: extractKeyRisks(session),
    actionItems,
    generatedAt: new Date().toISOString(),
  };
}

export function generateExecutiveSummary(session: CouncilSession): string {
  const minutes = generateMeetingMinutes(session);
  const lines: string[] = [];
  lines.push(`# ${minutes.title}`);
  lines.push(`Date: ${new Date(minutes.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  lines.push(`Duration: ${minutes.duration}`);
  lines.push(`Participants: ${minutes.participants.join(", ")}`);
  lines.push("");
  lines.push(`## Agenda (${minutes.resolvedCount}/${minutes.agendaCount} resolved)`);
  for (const a of session.agenda) {
    const icon = a.status === "resolved" ? "✓" : a.status === "discussing" ? "●" : "○";
    lines.push(`${icon} ${a.title} [${a.priority}]`);
  }
  lines.push("");
  if (minutes.decisions.length > 0) {
    lines.push("## Decisions");
    for (const d of minutes.decisions) {
      lines.push(`- ${d.title}: ${d.decision} (confidence: ${Math.round(d.confidence * 100)}%)`);
    }
    lines.push("");
  }
  if (minutes.keyRisks.length > 0) {
    lines.push("## Risks");
    for (const r of minutes.keyRisks) lines.push(`- ${r}`);
    lines.push("");
  }
  if (minutes.actionItems.length > 0) {
    lines.push("## Action Items");
    for (const a of minutes.actionItems) {
      lines.push(`- [${a.responsible}] ${a.action}${a.dueDate ? ` (due: ${new Date(a.dueDate).toLocaleDateString("id-ID")})` : ""}`);
    }
  }
  return lines.join("\n");
}

export function generateRisksSummary(session: CouncilSession): string[] {
  return extractKeyRisks(session);
}

export function generateNextMeetingRecommendation(session: CouncilSession): string[] {
  const recs: string[] = [];
  const pendingAgenda = session.agenda.filter(a => a.status !== "resolved");
  if (pendingAgenda.length > 0) recs.push(`Melanjutkan ${pendingAgenda.length} agenda yang belum selesai`);

  const unresolvedRisks = extractKeyRisks(session);
  if (unresolvedRisks.length > 0) recs.push(`Membahas risiko: ${unresolvedRisks.slice(0, 3).join(", ")}`);

  const decisionsNeedingReview = session.decisions.filter(d => d.confidence < 0.6);
  if (decisionsNeedingReview.length > 0) recs.push(`Review ${decisionsNeedingReview.length} keputusan dengan confidence rendah`);

  return recs;
}

function extractKeyRisks(session: CouncilSession): string[] {
  const riskSet = new Set<string>();
  for (const opinion of session.agenda.flatMap(a => a.discussion)) {
    for (const risk of opinion.risks) riskSet.add(risk);
  }
  return Array.from(riskSet).slice(0, 10);
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
