// ECP-043 Sprint 3: Elastic Budget Engine
// Budget determined by MissionProfile, not static presets.
// Governor reads the budget. No hardcoded numbers.

import type { MissionProfile, ElasticBudget } from "./mission-profile";

const BUDGET_MATRIX: Record<string, {
  tokens: Record<string, number>;
  cycles: Record<string, number>;
  tools: Record<string, number>;
  timeMs: Record<string, number>;
  reserve: number;
}> = {
  QUESTION: {
    tokens:  { LOW: 2000, MEDIUM: 3500, HIGH: 5000, EXTREME: 8000 },
    cycles:  { LOW: 1,    MEDIUM: 1,    HIGH: 2,   EXTREME: 3 },
    tools:   { LOW: 0,    MEDIUM: 0,    HIGH: 2,   EXTREME: 3 },
    timeMs:  { LOW: 15000, MEDIUM: 30000, HIGH: 45000, EXTREME: 60000 },
    reserve: 0.1,
  },
  ANALYSIS: {
    tokens:  { LOW: 5000, MEDIUM: 12000, HIGH: 25000, EXTREME: 50000 },
    cycles:  { LOW: 2,    MEDIUM: 4,     HIGH: 8,    EXTREME: 15 },
    tools:   { LOW: 3,    MEDIUM: 10,    HIGH: 25,   EXTREME: 50 },
    timeMs:  { LOW: 30000, MEDIUM: 90000, HIGH: 180000, EXTREME: 420000 },
    reserve: 0.2,
  },
  DEBUG: {
    tokens:  { LOW: 4000, MEDIUM: 18000, HIGH: 35000, EXTREME: 60000 },
    cycles:  { LOW: 2,    MEDIUM: 5,     HIGH: 10,   EXTREME: 20 },
    tools:   { LOW: 2,    MEDIUM: 15,    HIGH: 30,   EXTREME: 60 },
    timeMs:  { LOW: 30000, MEDIUM: 120000, HIGH: 240000, EXTREME: 480000 },
    reserve: 0.25,
  },
  IMPLEMENTATION: {
    tokens:  { LOW: 8000, MEDIUM: 20000, HIGH: 40000, EXTREME: 80000 },
    cycles:  { LOW: 3,    MEDIUM: 6,     HIGH: 12,   EXTREME: 25 },
    tools:   { LOW: 5,    MEDIUM: 20,    HIGH: 40,   EXTREME: 100 },
    timeMs:  { LOW: 60000, MEDIUM: 180000, HIGH: 360000, EXTREME: 720000 },
    reserve: 0.25,
  },
  DEPLOYMENT: {
    tokens:  { LOW: 6000, MEDIUM: 16000, HIGH: 32000, EXTREME: 64000 },
    cycles:  { LOW: 2,    MEDIUM: 5,     HIGH: 10,   EXTREME: 20 },
    tools:   { LOW: 4,    MEDIUM: 100,   HIGH: 100,  EXTREME: 100 },
    timeMs:  { LOW: 45000, MEDIUM: 120000, HIGH: 300000, EXTREME: 600000 },
    reserve: 0.3,
  },
  OPERATIONS: {
    tokens:  { LOW: 4000, MEDIUM: 10000, HIGH: 20000, EXTREME: 40000 },
    cycles:  { LOW: 2,    MEDIUM: 4,     HIGH: 8,    EXTREME: 15 },
    tools:   { LOW: 2,    MEDIUM: 8,     HIGH: 20,   EXTREME: 40 },
    timeMs:  { LOW: 30000, MEDIUM: 90000, HIGH: 180000, EXTREME: 360000 },
    reserve: 0.2,
  },
  BUSINESS: {
    tokens:  { LOW: 2000, MEDIUM: 5000, HIGH: 10000, EXTREME: 20000 },
    cycles:  { LOW: 1,    MEDIUM: 1,    HIGH: 2,    EXTREME: 3 },
    tools:   { LOW: 0,    MEDIUM: 0,    HIGH: 0,    EXTREME: 0 },
    timeMs:  { LOW: 15000, MEDIUM: 30000, HIGH: 60000, EXTREME: 120000 },
    reserve: 0.1,
  },
};

export class ElasticBudgetEngine {

  /** Compute budget from MissionProfile */
  compute(profile: MissionProfile): ElasticBudget {
    const matrix = BUDGET_MATRIX[profile.category] || BUDGET_MATRIX.QUESTION;
    const c = profile.complexity;

    const base: ElasticBudget = {
      maxTokens:  matrix.tokens[c],
      maxCycles:  matrix.cycles[c],
      maxTools:   matrix.tools[c],
      maxTimeMs:  matrix.timeMs[c],
      reserve:    matrix.reserve,
    };

    // Urgency multiplier
    if (profile.urgency === "CRITICAL") {
      base.maxTokens  = Math.ceil(base.maxTokens * 1.5);
      base.maxCycles  = Math.ceil(base.maxCycles * 1.5);
      base.maxTimeMs  = Math.ceil(base.maxTimeMs * 1.5);
    } else if (profile.urgency === "LOW") {
      base.maxTokens  = Math.ceil(base.maxTokens * 0.7);
      base.maxCycles  = Math.ceil(base.maxCycles * 0.7);
    }

    // Deep reasoning needs more tokens
    if (profile.reasoningDepth === "DEEP") {
      base.maxTokens = Math.ceil(base.maxTokens * 1.3);
    }

    // Unlimited tools for deployment
    if (profile.category === "DEPLOYMENT") {
      base.maxTools = 200;
    }

    return base;
  }
}

export const elasticBudgetEngine = new ElasticBudgetEngine();
