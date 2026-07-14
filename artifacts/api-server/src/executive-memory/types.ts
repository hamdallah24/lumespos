export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CAIO" | "CKO";

export type DecisionOutcome = "success" | "failure" | "partial" | "pending" | "unknown";

export type DecisionDomain = "strategy" | "operations" | "finance" | "technology" | "marketing" | "knowledge" | "governance";

export interface DecisionRecord {
  id: string;
  executive: ExecutiveRole;
  domain: DecisionDomain;
  title: string;
  description: string;
  situationId?: string;
  alternatives: string[];
  selectedOption: string;
  outcome: DecisionOutcome;
  confidence: number;
  tags: string[];
  relatedDecisionIds: string[];
  missionId?: string;
  outcomeUpdatedAt?: string;
  createdAt: string;
}

export interface DecisionFilter {
  executive?: ExecutiveRole;
  domain?: DecisionDomain;
  outcome?: DecisionOutcome;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface MemoryRecall {
  records: DecisionRecord[];
  total: number;
  contextPrompt: string;
}

export interface OutcomeRecord {
  decisionId: string;
  outcome: DecisionOutcome;
  notes?: string;
  updatedAt: string;
}

export interface DetectedPattern {
  id: string;
  type: "recurring_decision" | "executive_tendency" | "domain_outcome" | "risk_pattern";
  label: string;
  description: string;
  triggerCount: number;
  confidence: number;
  relatedDecisionIds: string[];
  detectedAt: string;
}

export interface ExecutiveMemoryStats {
  totalDecisions: number;
  byExecutive: Record<string, number>;
  byDomain: Record<string, number>;
  byOutcome: Record<string, number>;
  successRate: number;
  patternsDetected: number;
}
