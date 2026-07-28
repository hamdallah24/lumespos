import type { CouncilSession, CouncilAgendaItem, CouncilOpinion } from "./types";
import { setStatus, markMemberPresent } from "./CouncilSession";

export type ModeratorAction = "open" | "next_agenda" | "invite" | "limit_discussion" | "close_discussion" | "start_voting" | "generate_summary";

export function getModerator(session: CouncilSession): string {
  const ceo = session.executives.find(m => m.executive === "CEO");
  if (ceo?.present) return "CEO";
  const coo = session.executives.find(m => m.executive === "COO");
  if (coo?.present) return "COO";
  return session.executives.filter(m => m.present).sort((a, b) => b.votingWeight - a.votingWeight)[0]?.executive || "CEO";
}

export function openMeeting(session: CouncilSession): CouncilSession {
  return setStatus(session, "DISCUSSING");
}

export function nextAgenda(session: CouncilSession, currentAgendaId?: string): CouncilSession {
  if (currentAgendaId) {
    session = {
      ...session,
      agenda: session.agenda.map(a => a.id === currentAgendaId && a.status === "discussing" ? { ...a, status: "resolved", resolvedAt: new Date().toISOString() } : a),
    };
  }
  return session;
}

export function closeDiscussion(session: CouncilSession): CouncilSession {
  return setStatus(session, "CONSENSUS");
}

export function generateMeetingContext(session: CouncilSession, agenda: CouncilAgendaItem): string {
  const moderator = getModerator(session);
  const participants = session.executives.filter(m => m.present).map(m => `${m.executive} (weight: ${m.votingWeight}, ${m.responsibility})`);
  return `## Executive Council Meeting
Moderator: ${moderator}
Participants: ${participants.join(", ")}

### Current Agenda
${agenda.title}
${agenda.description}
Priority: ${agenda.priority}
`;
}
