// ECP-019: Execution Policy — shared configuration
// Frozen. Budget matrix, anti-loop thresholds, scheduler weights.
// All engines reference this. No engine creates its own policy.

import type { BudgetAllocation } from "./execution-manifest";

// completion-only tracking — budget mencakup OUTPUT tokens, bukan input+output
// Industri AI coding (OpenCode, Copilot) pakai context window + completion tracking
const budgetMatrix: Record<string, BudgetAllocation> = {
  simple:    { maxTokens: 8000,   maxTools: 8,   maxTimeMs: 60000,  maxIdleCycles: 2 },
  medium:    { maxTokens: 60000,  maxTools: 40,  maxTimeMs: 300000, maxIdleCycles: 6 },
  complex:   { maxTokens: 100000, maxTools: 80,  maxTimeMs: 600000, maxIdleCycles: 8 },
  critical:  { maxTokens: 150000, maxTools: 150, maxTimeMs: 900000, maxIdleCycles: 12 },
};

export const globalSafety: BudgetAllocation = {
  maxTokens: 200000, maxTools: 300, maxTimeMs: 1800000, maxIdleCycles: 20,
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
