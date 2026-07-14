export type UnifiedEvidenceSource =
  | "org_learning"
  | "knowledge_platform"
  | "council_learning"
  | "memory_engine"
  | "executive_history"
  | "semantic"
  | "episode"
  | "procedural"
  | "organizational";

export interface UnifiedEvidence {
  id: string;
  content: string;
  source: UnifiedEvidenceSource;
  originEngine: string;
  confidence: number;
  timestamp: string;
  executive?: string;
  domain?: string;
  importance: number;
  freshness: number;
  keywords?: string[];
  sourceRef?: string;
  conflictGroup?: string;
}

export interface UnifiedRetrievalQuery {
  mission?: string;
  domain?: string;
  executive?: string;
  maxResults?: number;
  minConfidence?: number;
  sources?: UnifiedEvidenceSource[];
}

export interface UnifiedFeedbackInput {
  decisionId: string;
  executive: string;
  domain: string;
  outcome: "success" | "failure" | "partial";
  confidence: number;
  summary: string;
  lessons?: string[];
  durationMs?: number;
}

export interface ConflictResolution {
  resolved: UnifiedEvidence;
  conflicts: { itemId: string; reason: string }[];
  resolutionStrategy: "keep_highest_confidence" | "keep_freshest" | "merge" | "keep_all";
}
