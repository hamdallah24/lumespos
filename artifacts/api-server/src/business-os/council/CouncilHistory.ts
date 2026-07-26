import type { CouncilSession, CouncilHistoryEntry } from "./types";

const MAX_HISTORY = 500;
const history: CouncilSession[] = [];

export function recordSession(session: CouncilSession): void {
  const existing = history.findIndex(s => s.sessionId === session.sessionId);
  if (existing >= 0) {
    history[existing] = session;
  } else {
    history.push(session);
  }
  if (history.length > MAX_HISTORY) history.shift();
}

export function getSession(sessionId: string): CouncilSession | undefined {
  return history.find(s => s.sessionId === sessionId);
}

export function getAllSessions(): CouncilSession[] {
  return [...history];
}

export function searchSessions(query: string): CouncilSession[] {
  const lower = query.toLowerCase();
  return history.filter(s =>
    s.title.toLowerCase().includes(lower) ||
    s.reason.toLowerCase().includes(lower) ||
    s.executives.some(m => m.executive.toLowerCase().includes(lower)) ||
    s.agenda.some(a => a.title.toLowerCase().includes(lower))
  );
}

export function filterSessions(options: { status?: string; executive?: string; fromDate?: string; toDate?: string; meetingType?: string }): CouncilSession[] {
  return history.filter(s => {
    if (options.status && s.status !== options.status) return false;
    if (options.executive && !s.executives.some(m => m.executive === options.executive)) return false;
    if (options.fromDate && s.createdAt < options.fromDate) return false;
    if (options.toDate && s.createdAt > options.toDate) return false;
    if (options.meetingType && s.meetingType !== options.meetingType) return false;
    return true;
  });
}

export function getHistoryEntries(): CouncilHistoryEntry[] {
  return history.map(s => ({
    sessionId: s.sessionId,
    title: s.title,
    date: s.createdAt,
    status: s.status,
    participants: s.executives.filter(m => m.present).map(m => m.executive),
    agendaCount: s.agenda.length,
    decisionCount: s.decisions.length,
    summary: s.summary?.generatedAt,
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRecentSessions(count: number = 10): CouncilSession[] {
  return [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, count);
}

export function getSessionsByExecutive(executive: string): CouncilSession[] {
  return history.filter(s => s.executives.some(m => m.executive === executive));
}

export function clearHistory(): void {
  history.length = 0;
}

export function count(): number {
  return history.length;
}
