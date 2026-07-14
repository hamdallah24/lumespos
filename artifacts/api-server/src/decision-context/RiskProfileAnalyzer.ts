import type { RiskProfile } from "./types";

let overrides: Partial<RiskProfile> = {};

export function setRiskProfile(profile: Partial<RiskProfile>): void {
  overrides = profile;
}

export function analyzeRiskProfile(): RiskProfile {
  return {
    riskTolerance: overrides.riskTolerance ?? "medium",
    maximumBudgetExposure: overrides.maximumBudgetExposure ?? 10000000,
    currentOperationalRisk: overrides.currentOperationalRisk ?? 0.3,
  };
}
