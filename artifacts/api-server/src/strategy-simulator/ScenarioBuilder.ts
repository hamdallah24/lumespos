import type { OperationalSituation } from "../operational-decision-engine/core/types";
import type { DecisionContext, RiskProfile, BusinessState, ResourceState } from "../decision-context/types";
import type { SimulationVariant } from "./types";
import type { StrategicDirection } from "../strategy-engine/core/types";
export type { StrategicDirection };

const DIRECTIONS: StrategicDirection[] = ["growth", "optimization", "cost_reduction", "quality", "risk_mitigation"];

const DIRECTION_LABELS: Record<StrategicDirection, string> = {
  growth: "Pertumbuhan Trafik",
  optimization: "Optimasi Margin",
  cost_reduction: "Efisiensi Biaya",
  quality: "Peningkatan Kualitas",
  risk_mitigation: "Mitigasi Risiko",
};

export function buildVariants(
  situation: OperationalSituation,
  context?: DecisionContext,
): SimulationVariant[] {
  const baseRisk: RiskProfile = context?.riskProfile ?? { riskTolerance: "medium", maximumBudgetExposure: 5000000, currentOperationalRisk: 0.4 };
  const baseResources: ResourceState = context?.resources ?? { inventoryAvailability: 0.7, productionCapacity: 0.6, logisticsCapacity: 0.5, availableBudget: 3000000 };
  const baseBusiness: BusinessState = context?.businessState ?? { cashAvailable: 5000000, activeBranches: 3, activeEmployees: 50, currentWorkload: 0.5, operatingHours: 12 };

  return DIRECTIONS.map((dir, i) => ({
    id: `variant-${situation.domain}-${dir}`,
    label: DIRECTION_LABELS[dir],
    direction: dir,
    riskTolerance: baseRisk.riskTolerance,
    availableBudget: baseResources.availableBudget,
    cashAvailable: baseBusiness.cashAvailable,
    currentOperationalRisk: baseRisk.currentOperationalRisk,
  }));
}

export function buildVariant(
  situation: OperationalSituation,
  overrides: {
    direction?: StrategicDirection;
    riskTolerance?: "low" | "medium" | "high";
    availableBudget?: number;
    cashAvailable?: number;
    currentOperationalRisk?: number;
  },
): SimulationVariant {
  const dir = overrides.direction ?? "optimization";
  return {
    id: `variant-${situation.domain}-${dir}`,
    label: DIRECTION_LABELS[dir],
    direction: dir,
    riskTolerance: overrides.riskTolerance ?? "medium",
    availableBudget: overrides.availableBudget ?? 3000000,
    cashAvailable: overrides.cashAvailable ?? 5000000,
    currentOperationalRisk: overrides.currentOperationalRisk ?? 0.4,
  };
}

export function variantToPartialContext(variant: SimulationVariant, situation: OperationalSituation): Partial<DecisionContext> {
  return {
    id: `ctx-${variant.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    businessState: { cashAvailable: variant.cashAvailable, activeBranches: 3, activeEmployees: 50, currentWorkload: 0.5, operatingHours: 12 },
    resources: { inventoryAvailability: 0.7, productionCapacity: 0.6, logisticsCapacity: 0.5, availableBudget: variant.availableBudget },
    riskProfile: { riskTolerance: variant.riskTolerance, maximumBudgetExposure: 5000000, currentOperationalRisk: variant.currentOperationalRisk },
    strategicContext: { activeCampaigns: [], currentQuarterGoals: [], northStarWeights: {}, founderPriority: [] },
    operationalContext: {},
  };
}
