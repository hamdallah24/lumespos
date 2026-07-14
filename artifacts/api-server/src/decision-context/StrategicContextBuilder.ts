import type { StrategicContext } from "./types";

let overrides: Partial<StrategicContext> = {};

export function setStrategicContext(ctx: Partial<StrategicContext>): void {
  overrides = ctx;
}

export function buildStrategicContext(): StrategicContext {
  return {
    activeCampaigns: overrides.activeCampaigns ?? [],
    currentQuarterGoals: overrides.currentQuarterGoals ?? ["profitability"],
    northStarWeights: overrides.northStarWeights ?? {
      profitability: 0.25,
      sustainability: 0.20,
      customer_satisfaction: 0.20,
      operational_efficiency: 0.20,
      risk_control: 0.15,
    },
    founderPriority: overrides.founderPriority ?? [],
  };
}
