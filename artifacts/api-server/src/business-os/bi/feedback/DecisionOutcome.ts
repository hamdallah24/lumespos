export type OutcomeStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "PENDING";

export interface DecisionOutcome {
  decisionId: string;
  executionId: string;
  executive: string;
  objective: string;
  action: string;
  executedAt: number;
  evaluatedAt: number;
  status: OutcomeStatus;
  score: number;
  expectedResult: string;
  actualResult: string;
  deviation: number;
  reason: string;
  kpiImpact: { kpiId: string; before: number; after: number; change: number }[];
}

export interface ForecastAccuracyResult {
  forecastId: string;
  metric: string;
  forecastValue: number;
  actualValue: number;
  error: number;
  errorPct: number;
  accuracy: number;
  confidence: number;
  evaluatedAt: number;
}

export interface RecommendationScore {
  recommendationId: string;
  title: string;
  executive: string;
  accepted: boolean;
  executed: boolean;
  successRate: number;
  averageImpact: number;
  count: number;
}

export interface StrategyResult {
  strategy: string;
  executive: string;
  usage: number;
  successes: number;
  failures: number;
  successRate: number;
  roi: number;
  risk: "low" | "medium" | "high";
  lastUsed: number;
}

export interface ExecutivePerformanceMetrics {
  executive: string;
  totalDecisions: number;
  successful: number;
  failed: number;
  partial: number;
  successRate: number;
  avgConfidence: number;
  calibratedConfidence: number;
  forecastAccuracy: number;
  avgDeviation: number;
  avgROI: number;
  trend: "improving" | "declining" | "stable";
}

export interface ConfidenceCalibrationEntry {
  decisionId: string;
  executive: string;
  originalConfidence: number;
  outcome: OutcomeStatus;
  calibratedConfidence: number;
  timestamp: number;
}

export interface ExecutiveLearningProfile {
  executive: string;
  strengths: { area: string; score: number }[];
  weaknesses: { area: string; score: number }[];
  failurePatterns: { pattern: string; count: number; severity: string }[];
  successPatterns: { pattern: string; count: number; avgConfidence: number }[];
  improvementAreas: string[];
  totalDecisions: number;
  overallScore: number;
}

export interface BIFeedback {
  outcomes: DecisionOutcome[];
  forecastAccuracy: ForecastAccuracyResult[];
  recommendations: RecommendationScore[];
  strategies: StrategyResult[];
  executivePerformance: ExecutivePerformanceMetrics[];
  calibrations: ConfidenceCalibrationEntry[];
  learningProfiles: ExecutiveLearningProfile[];
  lastUpdated: number;
}
