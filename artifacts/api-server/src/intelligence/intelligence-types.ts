// ECP-045: Intelligence Types — Shared types for Organizational Intelligence Network
// Validated knowledge, reputation, consensus, decisions.

export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CHRO" | "CIO";

// ── Organizational Memory ──

export type OrgKnowledgeType = "BEST_PRACTICE" | "LESSON" | "WARNING" | "STANDARD" | "INSIGHT";

export interface OrgKnowledgeNode {
  id: string;
  type: OrgKnowledgeType;
  content: string;
  sources: string[];            // Executive IDs that contributed
  domain: string;
  confidence: number;
  validated: boolean;
  validatedBy: string[];
  createdAt: string;
  lastReinforced: string;
  reinforcementCount: number;
  tags: string[];
}

// ── Executive Reputation ──

export interface ExecutiveReputation {
  executive: ExecutiveRole;
  accuracy: number;             // 0-100: how accurate their assessments
  successRate: number;          // 0-100: mission success rate
  confidence: number;           // 0-100: overall trust
  experience: number;           // total missions completed
  specialties: string[];        // domains they excel in
  lastUpdated: string;
  history: ReputationEntry[];
}

export interface ReputationEntry {
  missionId: string;
  outcome: "SUCCESS" | "FAILURE" | "PARTIAL";
  impact: number;               // -10 to +10 on reputation
  timestamp: string;
}

// ── Consensus ──

export type ConsensusVote = "YES" | "NO" | "ABSTAIN" | "DEFER";

export interface ConsensusOpinion {
  executive: ExecutiveRole;
  vote: ConsensusVote;
  recommendation: string;
  reasoning: string;
  confidence: number;
  reputation: number;           // weight from ExecutiveReputation
}

export interface ConsensusResult {
  question: string;
  opinions: ConsensusOpinion[];
  decision: ConsensusVote;
  weightedConfidence: number;
  dissenters: ExecutiveRole[];
  resolution: string;
  resolvedAt: string;
}

// ── Decision History ──

export interface DecisionHistory {
  decisionId: string;
  missionId: string;
  question: string;
  participants: ExecutiveRole[];
  alternatives: string[];
  selected: string;
  outcome: "SUCCESS" | "FAILURE" | "UNKNOWN";
  lessons: string[];
  decidedAt: string;
  evaluatedAt?: string;
}

// ── Cross-Executive Learning ──

export interface CrossLearningResult {
  sourceExecutive: ExecutiveRole;
  targetExecutive: ExecutiveRole;
  knowledgeNodes: OrgKnowledgeNode[];
  relevance: number;
  transferredAt: string;
}

// ── Organization Intelligence ──

export interface OrgIntelligenceReport {
  generatedAt: string;
  memoryStats: {
    totalValidated: number;
    byDomain: Record<string, number>;
    byType: Record<string, number>;
  };
  reputationRankings: ExecutiveReputation[];
  consensusStats: {
    totalDecisions: number;
    unanimousDecisions: number;
    contestedDecisions: number;
  };
  learningHealth: {
    crossTransfers: number;
    knowledgeGrowth: number;
    avgConfidence: number;
  };
}

// ── Factory Helpers ──

let _orgNodeCounter = 0;
let _decisionCounter = 0;

export function createOrgNodeId(): string { _orgNodeCounter++; return `ORG-${Date.now().toString(36)}-${_orgNodeCounter}`; }
export function createDecisionId(): string { _decisionCounter++; return `DEC-${Date.now().toString(36)}-${_decisionCounter}`; }
