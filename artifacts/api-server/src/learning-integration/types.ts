export type LearningCapability = "retrieval" | "ingestion" | "maintenance" | "pattern_detection" | "confidence_adjustment" | "outcome_tracking" | "feedback";

export const NOT_SUPPORTED = { actions: 0, details: ["NOT_SUPPORTED"] };

export interface UnifiedLearningResult {
  id: string;
  content: string;
  source: string;
  originEngine: string;
  confidence: number;
  timestamp: string;
  executive?: string;
  domain?: string;
  importance: number;
}

export interface LearningEngineInfo {
  id: string;
  name: string;
  version: string;
  capabilities: LearningCapability[];
}

export interface RetrieveInput {
  query: string;
  domain?: string;
  executive?: string;
  maxResults?: number;
  minConfidence?: number;
}

export interface IngestInput {
  content: string;
  executive?: string;
  domain?: string;
  outcome?: "success" | "failure" | "partial";
  metadata?: Record<string, unknown>;
}

export interface FeedbackInput {
  decisionId: string;
  outcome: "success" | "failure" | "partial";
  executive?: string;
  domain?: string;
  confidence: number;
  summary: string;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unavailable";
  message?: string;
  lastCheck: string;
  registered: boolean;
  supportedCapabilities: LearningCapability[];
  lastMaintenance?: string;
  lastFeedback?: string;
  lastRetrieve?: string;
  errors: number;
}

export interface IntegrationMetrics {
  retrieveCalls: number;
  ingestCalls: number;
  feedbackCalls: number;
  maintenanceRuns: number;
  failedCalls: number;
  averageLatency: number;
  perEngineCalls: Record<string, number>;
  perCapabilityCalls: Record<string, number>;
}

export interface LearningEngine {
  readonly info: LearningEngineInfo;
  retrieve(input: RetrieveInput): UnifiedLearningResult[];
  ingest(input: IngestInput): void;
  feedback(input: FeedbackInput): void;
  maintenance(): { actions: number; details: string[] };
  health(): HealthStatus;
}
