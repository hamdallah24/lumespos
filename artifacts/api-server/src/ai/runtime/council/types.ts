// ECP-033: Council Types — canonical decision governance types
// Frozen. Every council session, opinion, decision follows these types.

export interface CouncilSession {
  id: string;
  decisionId: string;
  question: string;
  traceId: string;
  status: "OPEN" | "DELIBERATING" | "CONSENSUS" | "CONFLICT" | "RESOLVED" | "ESCALATED" | "CLOSED";
  participants: CouncilParticipant[];
  opinions: CouncilOpinion[];
  consensus?: ConsensusResult;
  decision?: CouncilDecision;
  openedAt: string;
  closedAt?: string;
}

export interface CouncilParticipant {
  runtime: string;
  role: "CEO" | "CTO" | "COO" | "Consultant" | "KnowledgeGovernor";
  weight: number;
  status: "pending" | "submitted" | "recused";
  opinionId?: string;
}

export interface CouncilOpinion {
  id: string;
  sessionId: string;
  runtime: string;
  recommendation: "APPROVE" | "REJECT" | "MODIFY" | "WAIT";
  confidence: number;
  rationale: string;
  evidenceIds: string[];
  risks: string[];
  alternatives: string[];
  submittedAt: string;
}

export interface ConsensusResult {
  consensusScore: number;
  recommendation: "APPROVE" | "REJECT" | "MODIFY" | "ESCALATE";
  totalWeight: number;
  votes: { recommendation: string; weight: number; count: number }[];
  requiresEscalation: boolean;
  reason: string;
}

export interface CouncilDecision {
  id: string;
  sessionId: string;
  outcome: "APPROVED" | "REJECTED" | "MODIFIED" | "ESCALATED";
  consensus: number;
  participants: number;
  opinions: number;
  rationale: string;
  decidedAt: string;
  decidedBy: "Council" | "Founder";
  archived: boolean;
}

export type DecisionTrigger =
  | "foundation_change"
  | "architecture_change"
  | "policy_change"
  | "security_change"
  | "cross_runtime_decision"
  | "major_strategy"
  | "adr_proposal"
  | "founder_request";
