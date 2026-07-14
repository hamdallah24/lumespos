// EPIC T.1 — Executive Memory Engine (EME)

export { MemoryEngine } from "./engine/MemoryEngine";
export type { WriteMemoryInput, EngineStatus } from "./engine/MemoryEngine";

export { MemoryLifecycleEngine } from "./engine/MemoryLifecycle";
export { ImportanceEngine } from "./engine/ImportanceEngine";
export { ConsolidationEngine } from "./engine/ConsolidationEngine";
export type { ConsolidationResult } from "./engine/ConsolidationEngine";
export { DuplicateDetector } from "./engine/DuplicateDetector";
export { ConflictResolver } from "./engine/ConflictResolver";
export type { ConflictResolution, ConflictResolutionStrategy } from "./engine/ConflictResolver";
export { ForgettingEngine } from "./engine/ForgettingEngine";
export type { ForgettingCandidate, ForgettingResult } from "./engine/ForgettingEngine";
export { PromotionEngine } from "./engine/PromotionEngine";
export type { PromotionResult } from "./engine/PromotionEngine";
export { ValidationEngine } from "./engine/ValidationEngine";
export type { ValidationResult } from "./engine/ValidationEngine";

export { LifecyclePolicy } from "./policy/LifecyclePolicy";
export { ImportancePolicy } from "./policy/ImportancePolicy";
export { ForgettingPolicy } from "./policy/ForgettingPolicy";
export { PromotionPolicy } from "./policy/PromotionPolicy";
export type { ImportanceWeights, ImportanceThresholds } from "./policy/ImportancePolicy";
export type { ForgettingPolicyConfig } from "./policy/ForgettingPolicy";
export type { PromotionPolicyConfig } from "./policy/PromotionPolicy";

export type { MemoryLifecycleState } from "./models/MemoryLifecycle";
export { MEMORY_LIFECYCLE_ORDER, ALLOWED_TRANSITIONS } from "./models/MemoryLifecycle";
export type { MemoryImportanceScore, ImportanceLevel } from "./models/MemoryImportance";
export { classifyImportance } from "./models/MemoryImportance";
export type {
  MemoryRecord,
  ExecutiveScope,
  MemoryCategory,
  TraceEventType,
  MemoryTraceEvent,
  DuplicateRelation,
  DuplicateResult,
} from "./models/MemoryRecord";

export { MemoryTrace } from "./audit/MemoryTrace";
export type { TraceFilter } from "./audit/MemoryTrace";
export { MemoryHistory } from "./audit/MemoryHistory";
export { MemoryCertification } from "./audit/MemoryCertification";
export type { CertificationCriterion, CertificationReport } from "./audit/MemoryCertification";
