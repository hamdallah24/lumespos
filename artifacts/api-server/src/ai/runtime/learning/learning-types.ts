// ECP-033.5: Learning Types — OLS data structures
// Frozen. Observes, measures, evaluates. Never decides.

export interface DecisionOutcome {
  decisionId: string;
  runtime: string;
  councilSessionId?: string;
  decision: string;
  confidence: number;
  actualOutcome: "SUCCESS" | "PARTIAL" | "FAILED" | "PENDING";
  predictionError: number;        // |confidence - outcome|
  rootCause: string;
  timestamp: string;
  evidenceCount: number;
  learningApplied: boolean;
}

export interface ConfidenceCalibration {
  runtime: string;
  totalPredictions: number;
  overConfident: number;          // Predicted high, failed
  underConfident: number;         // Predicted low, succeeded
  calibrated: number;             // Predicted accurately
  calibrationScore: number;       // 0-100
  lastUpdated: string;
}

export interface RuntimeScorecard {
  runtime: string;
  metrics: Record<string, number>;
  trends: Record<string, "improving" | "stable" | "declining">;
  overallScore: number;
  recommendations: string[];
  lastUpdated: string;
}

export interface LearningPattern {
  id: string;
  type: "success_recipe" | "failure_recipe" | "confidence_bias" | "domain_pattern" | "runtime_pattern";
  description: string;
  evidenceIds: string[];
  confidence: number;
  occurrences: number;
  firstDetected: string;
  lastDetected: string;
  impact: "low" | "medium" | "high";
  recommendation: string;
}

export interface ImprovementProposal {
  id: string;
  source: string;                 // Which pattern triggered this
  type: "policy" | "training" | "architecture" | "process" | "delegation";
  description: string;
  expectedImpact: string;
  estimatedEffort: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected" | "implemented";
  targetRuntime?: string;
  createdAt: string;
}

export interface OrganizationHealth {
  overall: number;
  decisionQuality: number;
  knowledgeQuality: number;
  missionSuccess: number;
  policyCompliance: number;
  learningRate: number;            // How fast org improves
  components: Record<string, { score: number; status: string }>;
  generatedAt: string;
}
