// ECP-033: Council — public API
// Organizational Decision Council. Decision Governance System.

export { councilManager } from "./council-manager";
export { consensusEngine } from "./consensus-engine";
export { conflictResolver } from "./conflict-resolver";
export { escalationEngine } from "./escalation-engine";
export { decisionRecord } from "./decision-record";
export { participantEngine } from "./participant";
export { createOpinion, isValid } from "./opinion";
export { startSession, deliberate, reachConsensus, resolveConflict, escalate, closeSession } from "./council-session";
export { requiresCouncil, getCouncilPolicy, COUNCIL_ALWAYS, COUNCIL_NEVER, COUNCIL_RUNTIME_WEIGHTS } from "./council-policy";
export type { CouncilSession, CouncilParticipant, CouncilOpinion, ConsensusResult, CouncilDecision, DecisionTrigger } from "./types";
