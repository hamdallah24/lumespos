// ECP-019: Execution Policy — shared configuration
// Frozen. Budget matrix, anti-loop thresholds, scheduler weights.
// All engines reference this. No engine creates its own policy.

import type { BudgetAllocation } from "./execution-manifest";

const budgetMatrix: Record<string, BudgetAllocation> = {
  simple:    { maxTokens: 5000,  maxTools: 5,   maxTimeMs: 30000,  maxIdleCycles: 2 },
  medium:    { maxTokens: 25000, maxTools: 20,  maxTimeMs: 120000, maxIdleCycles: 4 },
  complex:   { maxTokens: 30000, maxTools: 60,  maxTimeMs: 300000, maxIdleCycles: 6 },
  critical:  { maxTokens: 60000, maxTools: 120, maxTimeMs: 600000, maxIdleCycles: 8 },
};

export const globalSafety: BudgetAllocation = {
  maxTokens: 80000, maxTools: 200, maxTimeMs: 900000, maxIdleCycles: 12,
};

export const antiLoop: Record<string, number> = {
  simple: 3, medium: 4, complex: 6, critical: 8,
};

export const schedulerWeights = {
  currentLoad: 0.35,
  capabilityScore: 0.25,
  latency: 0.15,
  health: 0.15,
  affinity: 0.10,
};

export const schedulerConstraints = {
  maxLoadBeforeSkip: 80,
  maxQueueDepth: 10,
};

export const completionWeights = {
  executionProgress: 0.70,
  assignmentProgress: 0.30,
};

export function resolveBudget(complexity: string): BudgetAllocation {
  return budgetMatrix[complexity] || budgetMatrix.medium;
}

export function getAntiLoopThreshold(complexity: string): number {
  return antiLoop[complexity] || antiLoop.medium;
}

export const evidenceThresholds: Record<string, number> = {
  simple: 1, medium: 2, complex: 3, critical: 4,
};

export const executionPolicy = {
  resolveBudget, getAntiLoopThreshold,
  budgetMatrix, globalSafety, antiLoop, schedulerWeights, schedulerConstraints, completionWeights,
  evidenceThresholds,
};
