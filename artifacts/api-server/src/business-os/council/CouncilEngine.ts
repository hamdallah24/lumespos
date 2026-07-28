import type { CouncilSession, CouncilStatus, CouncilAgendaItem, CorporateDecision, CouncilVote } from "./types";
import { createSession } from "./CouncilSession";
import { createAgendaItem } from "./CouncilAgenda";
import * as CouncilMember from "./CouncilMember";
import * as CouncilModerator from "./CouncilModerator";
import * as CouncilConsensus from "./CouncilConsensus";
import * as CouncilVoting from "./CouncilVoting";
import * as CouncilDecision from "./CouncilDecision";
import * as CouncilHistory from "./CouncilHistory";
import { feedSessionToMemory, feedDecisionToMemory, feedSessionToKnowledge } from "./CouncilMemory";
import { syncDecisionsToWorkspace, syncObjectivesFromCouncil, syncAgendaToTask } from "./CouncilWorkspace";
import { generateMeetingMinutes } from "./CouncilSummary";

export async function startSession(title: string, reason: string, trigger: string, meetingType: "daily_brief" | "weekly_meeting" | "monthly_review" | "quarter_review" | "year_planning" | "emergency" | "manual", agendaOverrides?: { title: string; description: string; priority: "low" | "normal" | "high" | "critical"; requiredExecutives?: string[] }[]): Promise<CouncilSession> {
  const session = createSession(title, reason, trigger, meetingType);

  if (agendaOverrides) {
    session.agenda = agendaOverrides.map(a => createAgendaItem(a.title, a.description, a.priority, a.requiredExecutives));
  }

  await CouncilMember.gatherMembers(session);
  await CouncilModerator.startSession(session);
  CouncilHistory.recordSession(session);
  return session;
}

export async function continueSession(sessionId: string): Promise<CouncilSession | null> {
  const session = CouncilHistory.getSession(sessionId);
  if (!session || session.status === "FINISHED" || session.status === "CANCELLED") return null;

  if (!session.startedAt) {
    session.startedAt = new Date().toISOString();
  }

  for (const agenda of session.agenda) {
    if (agenda.status !== "resolved" && agenda.status !== "skipped") {
      session.status = "DISCUSSING";
      agenda.status = "discussing";
      const opinions = await CouncilModerator.collectOpinions(session, agenda);
      agenda.discussion = opinions;

      const consensus = CouncilConsensus.mergeOpinions(session, agenda);
      if (consensus) {
        agenda.status = "resolved";
        agenda.resolution = consensus;
      }
    }
  }

  const unresolved = session.agenda.filter(a => a.status !== "resolved" && a.status !== "skipped");
  if (unresolved.length === 0) {
    session.status = "CONSENSUS";
    if (session.agenda.some(a => a.status === "resolved")) {
      session.status = "VOTING";
      const votes = await CouncilVoting.holdVote(session);
      session.votes = votes;

      for (const vote of votes) {
        if (vote.result === "approved") {
          const decision = await CouncilDecision.buildDecision(session, vote);
          if (decision) {
            session.decisions.push(decision);
            await feedDecisionToMemory(decision, session);
          }
        }
      }
    }

    session.status = "EXECUTING";
    session.confidence = session.decisions.length > 0 ? session.decisions.reduce((a, d) => a + d.confidence, 0) / session.decisions.length : 0.5;
    session.summary = generateMeetingMinutes(session);
    session.finishedAt = new Date().toISOString();
    session.durationMs = new Date(session.finishedAt).getTime() - new Date(session.startedAt!).getTime();
    session.status = "FINISHED";

    await feedSessionToMemory(session);
    await feedSessionToKnowledge(session);
    syncDecisionsToWorkspace(session);
    syncObjectivesFromCouncil(session);
    syncAgendaToTask(session);

    CouncilHistory.recordSession(session);
  }

  return session;
}

export async function resumeSession(sessionId: string): Promise<CouncilSession | null> {
  return continueSession(sessionId);
}

export async function cancelSession(sessionId: string): Promise<boolean> {
  const session = CouncilHistory.getSession(sessionId);
  if (!session) return false;
  session.status = "CANCELLED";
  session.finishedAt = new Date().toISOString();
  CouncilHistory.recordSession(session);
  return true;
}

export async function finishSession(sessionId: string): Promise<CouncilSession | null> {
  return continueSession(sessionId);
}

export async function replaySession(sessionId: string): Promise<boolean> {
  const session = CouncilHistory.getSession(sessionId);
  if (!session) return false;
  await feedSessionToMemory(session);
  await feedSessionToKnowledge(session);
  syncDecisionsToWorkspace(session);
  return true;
}

export function summarizeSession(sessionId: string): string | null {
  const session = CouncilHistory.getSession(sessionId);
  if (!session?.summary) return null;
  const lines = [
    `## ${session.summary.title}`,
    `Date: ${new Date(session.summary.date).toLocaleDateString("id-ID")}`,
    `Duration: ${session.summary.duration}`,
    `Participants: ${session.summary.participants.join(", ")}`,
    `Agenda: ${session.summary.resolvedCount}/${session.summary.agendaCount} resolved`,
    ``,
    `### Decisions`,
    ...session.summary.decisions.map(d => `- ${d.title}: ${d.decision.slice(0, 120)}...`),
    ``,
    `### Risks`,
    ...session.summary.keyRisks.map(r => `- ${r}`),
    ``,
    `### Action Items`,
    ...session.summary.actionItems.map(a => `- [${a.responsible}] ${a.action}${a.dueDate ? ` (due: ${a.dueDate.slice(0, 10)})` : ""}`),
  ];
  return lines.join("\n");
}

export const CouncilEngine = {
  startSession,
  continueSession,
  resumeSession,
  cancelSession,
  finishSession,
  replaySession,
  summarizeSession,
};
