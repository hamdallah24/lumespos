// ECP-043: Mission Profile — Shared types for intelligence layer
// Extends Foundation. Zero changes to Governor/Pipeline/Driver.

export type MissionCategory =
  | "QUESTION"
  | "ANALYSIS"
  | "DEBUG"
  | "IMPLEMENTATION"
  | "DEPLOYMENT"
  | "OPERATIONS"
  | "BUSINESS";

export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
export type UrgencyLevel = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type ReasoningDepth = "SHALLOW" | "NORMAL" | "DEEP";
export type ExplorationLevel = "NONE" | "LIMITED" | "FULL";
export type ExecutionCost = "CHEAP" | "NORMAL" | "EXPENSIVE";
export type ConfidenceRequirement = "LOW" | "MEDIUM" | "HIGH";

export interface MissionProfile {
  missionId: string;
  category: MissionCategory;
  complexity: ComplexityLevel;
  urgency: UrgencyLevel;
  reasoningDepth: ReasoningDepth;
  explorationLevel: ExplorationLevel;
  executionCost: ExecutionCost;
  confidenceRequirement: ConfidenceRequirement;
}

export type ExecutionStrategy = "INSPECT" | "ANALYZE" | "REASON" | "RESEARCH" | "PLAN" | "BUILD" | "FIX" | "VERIFY" | "DEPLOY" | "CONCLUDE";

export interface StrategyPlan {
  phases: ExecutionStrategy[];
}

export interface ElasticBudget {
  maxTokens: number;
  maxCycles: number;
  maxTools: number;
  maxTimeMs: number;
  reserve: number;
}

export type VerificationMode = "OFF" | "LIGHT" | "STRICT" | "CONSENSUS";

export interface VerificationProfile {
  mode: VerificationMode;
  confidenceThreshold: number;
  evidenceRequired: boolean;
  consensusRequired: boolean;
}

export interface ToolStrategy {
  allowedTools: string[];
  preferredTools: string[];
  forbiddenTools: string[];
  executionOrder: string[];
}

export type ExitMode = "OBJECTIVE_COMPLETED" | "EVIDENCE_SUFFICIENT" | "HEALTH_CHECK" | "PLAN_COMPLETE" | "ROOT_CAUSE_FOUND" | "IMMEDIATE";

export interface ExitStrategy {
  mode: ExitMode;
  stopCondition: string;
  successCondition: string;
  retryAllowed: boolean;
}

let _profileCounter = 0;

export function createMissionId(): string {
  _profileCounter++;
  return `MISSION-${Date.now().toString(36)}-${_profileCounter}`;
}
