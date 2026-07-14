import type { MemoryLifecycleState } from "./MemoryLifecycle";
import type { MemoryImportanceScore } from "./MemoryImportance";

export type ExecutiveScope = "GLOBAL" | "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CAIO" | "CKO" | "CHRO";

export type MemoryCategory = "decision" | "insight" | "fact" | "preference" | "pattern" | "relationship" | "event" | "learning";

export type TraceEventType = "created" | "modified" | "merged" | "promoted" | "archived" | "forgotten" | "validated" | "conflict_resolved" | "demoted";

export interface MemoryTraceEvent {
  event: TraceEventType;
  timestamp: string;
  previousState?: MemoryLifecycleState;
  newState?: MemoryLifecycleState;
  detail?: string;
}

export type DuplicateRelation = "identical" | "similar" | "conflicting" | "complementary";

export interface DuplicateResult {
  sourceId: string;
  targetId: string;
  relation: DuplicateRelation;
  similarityScore: number;
}

export interface MemoryRecord {
  id: string;
  content: string;
  category: MemoryCategory;
  scope: ExecutiveScope;
  lifecycleState: MemoryLifecycleState;
  importance: MemoryImportanceScore;

  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  validFrom?: string;
  validUntil?: string;

  accessCount: number;
  recurrenceCount: number;

  confidence: number;
  owner: string;
  source: string;
  tags: string[];

  trace: MemoryTraceEvent[];

  mergedFrom?: string[];
}
