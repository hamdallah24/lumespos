export type KnowledgeType = "semantic" | "episode" | "procedural";
export type OutcomeStatus = "success" | "failure" | "neutral" | "partial";
export type KnowledgeStatus = "observed" | "confirmed" | "active" | "deprecated" | "archived";

export interface EntityRef {
  entityType: string;
  entityId: string | number;
  name: string;
}

export interface KnowledgeBlock {
  id: string;
  type: KnowledgeType;
  domain: string;
  topic: string;
  summary: string;
  tags: string[];
  entityRefs: EntityRef[];
  sourceRefs: string[];

  semantic?: {
    fact: string;
    source: string;
    verifiedAt: string;
    expiresAt?: string;
  };
  episode?: {
    eventType: string;
    eventId: string;
    timestamp: string;
    context: string;
    outcome: OutcomeStatus;
    involvedEntities: EntityRef[];
  };
  procedural?: {
    condition: string;
    action: string;
    parameters: Record<string, unknown>;
    successRate: number;
    executionCount: number;
  };

  confidence: number;
  importance: number;
  recurrence: number;
  firstObserved: string;
  lastObserved: string;
  lastOutcome?: OutcomeStatus;

  status: KnowledgeStatus;
}
