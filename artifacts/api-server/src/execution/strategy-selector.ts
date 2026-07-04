// ECP-043 Sprint 2: Strategy Selector
// Converts MissionProfile into an ExecutionStrategy plan.
// No hardcoded strategy. Adaptive to mission.

import type { MissionProfile, ExecutionStrategy, StrategyPlan } from "./mission-profile";

const STRATEGY_TEMPLATES: Record<string, ExecutionStrategy[]> = {
  DEBUG:             ["INSPECT", "ANALYZE", "FIX", "VERIFY", "CONCLUDE"],
  DEPLOYMENT:        ["INSPECT", "DEPLOY", "VERIFY", "CONCLUDE"],
  IMPLEMENTATION:    ["RESEARCH", "PLAN", "BUILD", "VERIFY", "CONCLUDE"],
  ANALYSIS:          ["INSPECT", "ANALYZE", "CONCLUDE"],
  OPERATIONS:        ["INSPECT", "ANALYZE", "CONCLUDE"],
  BUSINESS:          ["REASON", "RESEARCH", "PLAN", "CONCLUDE"],
  QUESTION:          ["REASON", "CONCLUDE"],
};

export class StrategySelector {

  /** Build execution strategy plan from mission profile */
  select(profile: MissionProfile): StrategyPlan {
    const base = STRATEGY_TEMPLATES[profile.category] || ["ANALYZE", "CONCLUDE"];
    let phases = [...base];

    // Adapt based on complexity
    if (profile.complexity === "EXTREME") {
      phases = this.deepen(phases);
    } else if (profile.complexity === "LOW") {
      phases = this.shorten(phases);
    }

    // Adapt based on reasoning depth
    if (profile.reasoningDepth === "DEEP" && !phases.includes("RESEARCH")) {
      phases.unshift("RESEARCH");
    }

    // Adapt based on exploration
    if (profile.explorationLevel === "FULL" && !phases.includes("INSPECT")) {
      phases.unshift("INSPECT");
    }

    // Always end with CONCLUDE
    if (phases[phases.length - 1] !== "CONCLUDE") {
      phases.push("CONCLUDE");
    }

    return { phases };
  }

  private deepen(phases: ExecutionStrategy[]): ExecutionStrategy[] {
    const result: ExecutionStrategy[] = [];
    for (const p of phases) {
      if (p === "BUILD" && !result.includes("RESEARCH")) result.push("RESEARCH");
      result.push(p);
    }
    return result;
  }

  private shorten(phases: ExecutionStrategy[]): ExecutionStrategy[] {
    return phases.filter(p => p !== "RESEARCH" && p !== "VERIFY");
  }
}

export const strategySelector = new StrategySelector();
