// ECP-033: Council Session — lifecycle management for council sessions
// Frozen. OPEN → DELIBERATING → CONSENSUS → CONFLICT → RESOLVED/ESCALATED → CLOSED

import type { CouncilSession, CouncilOpinion, ConsensusResult, CouncilDecision } from "./types";
import type { DecisionTrigger } from "./types";

let _counter = 0;

export function startSession(
  question: string,
  traceId: string,
  trigger: DecisionTrigger,
  participants: CouncilSession["participants"],
): CouncilSession {
  _counter++;
  return {
    id: `CS-${String(_counter).padStart(5, "0")}`,
    decisionId: `pending-${_counter}`,
    question,
    traceId,
    status: "OPEN",
    participants,
    opinions: [],
    openedAt: new Date().toISOString(),
  };
}

export function deliberate(session: CouncilSession): void {
  session.status = "DELIBERATING";
}

export function reachConsensus(session: CouncilSession, result: ConsensusResult): void {
  session.consensus = result;
  session.status = result.requiresEscalation ? "CONFLICT" : "CONSENSUS";
}

export function resolveConflict(session: CouncilSession, newOpinions: CouncilOpinion[]): void {
  session.opinions.push(...newOpinions);
  session.status = "RESOLVED";
}

export function escalate(session: CouncilSession): void {
  session.status = "ESCALATED";
}

export function closeSession(session: CouncilSession, decision: CouncilDecision): void {
  session.decision = decision;
  session.status = "CLOSED";
  session.closedAt = new Date().toISOString();
}
