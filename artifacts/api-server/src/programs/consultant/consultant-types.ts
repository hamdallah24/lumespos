// ECP-030: Consultant Types — CKO data structures
// Frozen. Consultant outputs: Findings, Recommendations, Proposals, Reports.

export interface Finding {
  id: string;
  type: "knowledge_gap" | "policy_drift" | "foundation_drift" | "architecture_debt" | "runtime_override" | "duplicate_knowledge" | "stale_knowledge";
  description: string;
  evidence: string[];
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  domain: string;
}

export interface ConsultantRecommendation {
  id: string;
  findingId: string;
  action: string;
  rationale: string;
  confidence: number;
  priority: "normal" | "high" | "critical";
  owner: string;
  proposedADR?: string;
  expectedImpact: string;
  estimatedEffort: string;
  status: "pending" | "accepted" | "rejected" | "implemented";
}

export interface WeeklyReport {
  period: string;            // ISO week
  summary: string;
  knowledgeGrowth: number;    // Cards added this week
  missionSuccess: number;     // % missions completed
  failureTrend: "improving" | "stable" | "declining";
  topFindings: Finding[];
  architectureDebtCount: number;
  policyDriftCount: number;
  openRecommendations: number;
  nextPriorities: string[];
}

export interface MonthlyReport {
  period: string;            // ISO month
  executiveSummary: string;
  knowledgeGrowth: number;
  knowledgeCardCount: number;
  runtimePerformance: {
    missionSuccessRate: number;
    avgCompletionTimeMs: number;
    tokenEfficiency: number;
  };
  topImprovements: string[];
  biggestRisks: string[];
  foundationCandidates: number;
  foundationProposals: number;
  organizationHealthScore: number;
}

export type ConsultantMode =
  | "architecture_review"
  | "knowledge_audit"
  | "technical_debt"
  | "policy_audit"
  | "weekly_review"
  | "monthly_review"
  | "founder_advisory"
  | "proposal_generator";

export interface ConsultantKPI {
  duplicateKnowledgeRate: number;
  foundationDriftCount: number;
  architectureDebtTrend: "improving" | "stable" | "declining";
  knowledgeCoverage: number;
  proposalAcceptanceRate: number;
  tokenReduction: number;
  runtimeConsistency: number;
}

export interface StrategicCache {
  generatedAt: string;
  mode: ConsultantMode;
  foundationSummary: string;
  topPolicyDrifts: Finding[];
  topArchitectureDebts: Finding[];
  recentProposals: ConsultantRecommendation[];
  knowledgeDigest: string;
  organizationHealthScore: number;
  totalTokenEstimate: number;
}
