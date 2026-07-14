import type { MetricDomain } from "../../business-intelligence/core/types";

export type SituationSeverity = "low" | "medium" | "high" | "critical";

export type ApprovalLevel = "auto" | "manager" | "coo" | "ceo" | "founder";

export type SituationSource = "rule" | "ai";

export interface CandidateDecision {
  id: string;
  title: string;
  description: string;
  actionType: string;
  params: Record<string, unknown>;
  confidence: number;
  estimatedEffect?: {
    metric: string;
    expectedChange: number;
    unit: string;
  };
}

export interface OperationalSituation {
  id: string;
  domain: MetricDomain;
  title: string;
  description: string;
  severity: SituationSeverity;
  sourceFacts: string[];
  sourceEvents?: string[];

  financialImpact?: {
    estimatedLoss: number;
    probability: number;
    currency: string;
  };
  operationalImpact?: {
    affectedArea: string;
    severity: "low" | "medium" | "high";
    description: string;
  };

  priority: number;
  priorityRationale: string;

  approvalLevel: ApprovalLevel;
  approvalDeadline?: Date;
  approvalRationale: string;

  candidateDecisions: CandidateDecision[];

  timestamp: Date;
  branchId?: number;
  source: SituationSource;
}

export interface ImpactResult {
  financialImpact?: OperationalSituation["financialImpact"];
  operationalImpact?: OperationalSituation["operationalImpact"];
}

export interface PriorityResult {
  score: number;
  rationale: string;
}

export interface ApprovalResult {
  level: ApprovalLevel;
  deadline?: Date;
  rationale: string;
}
