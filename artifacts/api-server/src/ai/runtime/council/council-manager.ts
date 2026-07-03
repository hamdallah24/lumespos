// ECP-033: Council Manager — Decision Governance Orchestrator
// Frozen. Manages the full council lifecycle.
// OPEN → DELIBERATE → CONSENSUS → CONFLICT → RESOLVE → CLOSE

import type { CouncilSession, CouncilOpinion } from "./types";
import type { DecisionTrigger } from "./types";
import { startSession, deliberate, reachConsensus, resolveConflict, escalate, closeSession } from "./council-session";
import { participantEngine } from "./participant";
import { createOpinion } from "./opinion";
import { consensusEngine } from "./consensus-engine";
import { conflictResolver } from "./conflict-resolver";
import { escalationEngine } from "./escalation-engine";
import { decisionRecord } from "./decision-record";
import { requiresCouncil } from "./council-policy";

interface CouncilResult {
  session: CouncilSession;
  requiresFounderEscalation: boolean;
  escalationMessage: string;
}

class CouncilManager {
  /** Initiate a council for a decision */
  convene(question: string, traceId: string, trigger: DecisionTrigger): CouncilResult | null {
    if (!requiresCouncil(trigger)) return null;

    const participants = participantEngine.select(trigger);
    const session = startSession(question, traceId, trigger, participants);

    return {
      session,
      requiresFounderEscalation: false,
      escalationMessage: "",
    };
  }

  /** Submit an opinion from a runtime */
  submitOpinion(
    session: CouncilSession,
    runtime: string,
    recommendation: CouncilOpinion["recommendation"],
    confidence: number,
    rationale: string,
    evidenceIds: string[] = [],
    risks: string[] = [],
    alternatives: string[] = [],
  ): CouncilOpinion {
    const opinion = createOpinion(session.id, runtime, recommendation, confidence, rationale, evidenceIds, risks, alternatives);
    session.opinions.push(opinion);

    // Mark participant as submitted
    const participant = session.participants.find(p => p.runtime === runtime);
    if (participant) {
      participant.status = "submitted";
      participant.opinionId = opinion.id;
    }

    return opinion;
  }

  /** Process all opinions and reach consensus */
  process(session: CouncilSession, trigger: DecisionTrigger): CouncilResult {
    // Check if all required participants have submitted
    const pending = session.participants.filter(p => p.status === "pending");
    if (pending.length > 0) {
      return {
        session,
        requiresFounderEscalation: false,
        escalationMessage: `Waiting for opinions: ${pending.map(p => p.runtime).join(", ")}`,
      };
    }

    // Step 1: Compute consensus
    const consensus = consensusEngine.compute(session.opinions);
    reachConsensus(session, consensus);

    // Step 2: Handle conflict
    if (session.status === "CONFLICT") {
      const resolution = conflictResolver.resolve(session);
      if (!resolution.resolved) {
        resolveConflict(session, resolution.newOpinions);
        const newConsensus = consensusEngine.compute(session.opinions);
        reachConsensus(session, newConsensus);
      }
    }

    // Step 3: Check escalation
    const needsEscalation = escalationEngine.shouldEscalate(session, trigger);
    if (needsEscalation) {
      escalate(session);
      return {
        session,
        requiresFounderEscalation: true,
        escalationMessage: escalationEngine.formatEscalation(session),
      };
    }

    // Step 4: Record decision
    const finalOutcome = session.consensus?.recommendation === "APPROVE" ? "APPROVED"
      : session.consensus?.recommendation === "REJECT" ? "REJECTED"
      : "MODIFIED";

    const decision = decisionRecord.record(
      session.id,
      finalOutcome,
      session.consensus?.consensusScore || 0,
      session.participants.length,
      session.opinions.length,
      `Council consensus at ${session.consensus?.consensusScore || 0}%. ${session.participants.length} participants.`,
    );

    closeSession(session, decision);

    return {
      session,
      requiresFounderEscalation: false,
      escalationMessage: "",
    };
  }
}

export const councilManager = new CouncilManager();
