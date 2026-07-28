import * as CouncilHistory from "./CouncilHistory";
import { feedSessionToMemory, feedSessionToKnowledge } from "./CouncilMemory";
import { syncDecisionsToWorkspace } from "./CouncilWorkspace";

export async function replaySession(sessionId: string, feedMemory: boolean = true, syncWorkspace: boolean = true): Promise<boolean> {
  const session = CouncilHistory.getSession(sessionId);
  if (!session) return false;

  if (feedMemory) {
    await feedSessionToMemory(session);
    await feedSessionToKnowledge(session);
    for (const decision of session.decisions) {
      await feedSessionToMemory(decision, session);
    }
  }

  if (syncWorkspace) {
    syncDecisionsToWorkspace(session);
  }

  return true;
}

export async function replayByDateRange(fromDate: string, toDate: string, feedMemory: boolean = true): Promise<number> {
  const sessions = CouncilHistory.filterSessions({ fromDate, toDate });
  let count = 0;
  for (const session of sessions) {
    await replaySession(session.sessionId, feedMemory, false);
    count++;
  }
  return count;
}

export async function replayByExecutive(executive: string, limit: number = 10): Promise<number> {
  const sessions = CouncilHistory.getSessionsByExecutive(executive).slice(0, limit);
  let count = 0;
  for (const session of sessions) {
    await replaySession(session.sessionId, true, true);
    count++;
  }
  return count;
}

export async function replayByObjective(objective: string): Promise<number> {
  const sessions = CouncilHistory.searchSessions(objective);
  let count = 0;
  for (const session of sessions) {
    await replaySession(session.sessionId, true, true);
    count++;
  }
  return count;
}

export async function rebuildCouncilKnowledge(): Promise<number> {
  const sessions = CouncilHistory.getAllSessions();
  let count = 0;
  for (const session of sessions) {
    await replaySession(session.sessionId, true, false);
    count++;
  }
  return count;
}
