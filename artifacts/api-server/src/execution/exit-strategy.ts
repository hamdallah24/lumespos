// ECP-043 Sprint 6: Adaptive Exit Strategy
// Determines stop conditions based on MissionProfile.
// No static exit policy. Adaptive to mission.

import type { MissionProfile, ExitStrategy, ExitMode } from "./mission-profile";

const EXIT_BY_CATEGORY: Record<string, {
  mode: ExitMode;
  stopCondition: string;
  successCondition: string;
  retryAllowed: boolean;
}> = {
  QUESTION: {
    mode: "IMMEDIATE",
    stopCondition: "Response given",
    successCondition: "Answer provided",
    retryAllowed: false,
  },
  ANALYSIS: {
    mode: "EVIDENCE_SUFFICIENT",
    stopCondition: "Evidence collected",
    successCondition: "Analysis complete with sufficient data",
    retryAllowed: true,
  },
  DEBUG: {
    mode: "ROOT_CAUSE_FOUND",
    stopCondition: "Root cause identified",
    successCondition: "Root cause identified + fix validated",
    retryAllowed: true,
  },
  IMPLEMENTATION: {
    mode: "OBJECTIVE_COMPLETED",
    stopCondition: "All implementation goals met",
    successCondition: "Code built, verified, and working",
    retryAllowed: true,
  },
  DEPLOYMENT: {
    mode: "HEALTH_CHECK",
    stopCondition: "Deploy successful + health pass",
    successCondition: "Service healthy after deploy",
    retryAllowed: false,
  },
  OPERATIONS: {
    mode: "OBJECTIVE_COMPLETED",
    stopCondition: "Operational task completed",
    successCondition: "Operation executed successfully",
    retryAllowed: true,
  },
  BUSINESS: {
    mode: "PLAN_COMPLETE",
    stopCondition: "Business plan generated",
    successCondition: "Plan with action items delivered",
    retryAllowed: false,
  },
};

export class ExitStrategyEngine {

  /** Compute exit strategy from mission profile */
  compute(profile: MissionProfile): ExitStrategy {
    const base = EXIT_BY_CATEGORY[profile.category]
      || EXIT_BY_CATEGORY.QUESTION;

    const strategy: ExitStrategy = { ...base };

    // Critical urgency: allow retry regardless
    if (profile.urgency === "CRITICAL") {
      strategy.retryAllowed = true;
    }

    // Deep reasoning: evidence-driven exit
    if (profile.reasoningDepth === "DEEP" && base.mode !== "IMMEDIATE") {
      strategy.mode = "EVIDENCE_SUFFICIENT";
      strategy.stopCondition = "Sufficient evidence + deep reasoning complete";
    }

    return strategy;
  }
}

export const exitStrategyEngine = new ExitStrategyEngine();
