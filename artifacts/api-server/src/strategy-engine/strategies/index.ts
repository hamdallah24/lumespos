export { createTrafficGrowthStrategy } from "./TrafficGrowthStrategy";
export { createMarginOptimizationStrategy } from "./MarginOptimizationStrategy";
export { createCostReductionStrategy } from "./CostReductionStrategy";
export { createQualityImprovementStrategy } from "./QualityImprovementStrategy";
export { createRiskMitigationStrategy } from "./RiskMitigationStrategy";

import type { StrategicObjective } from "../core/types";
import { createTrafficGrowthStrategy } from "./TrafficGrowthStrategy";
import { createMarginOptimizationStrategy } from "./MarginOptimizationStrategy";
import { createCostReductionStrategy } from "./CostReductionStrategy";
import { createQualityImprovementStrategy } from "./QualityImprovementStrategy";
import { createRiskMitigationStrategy } from "./RiskMitigationStrategy";

export function createStrategyByDirection(
  direction: string,
  base: Partial<StrategicObjective>,
): StrategicObjective {
  const map: Record<string, (b: Partial<StrategicObjective>) => StrategicObjective> = {
    growth: createTrafficGrowthStrategy,
    optimization: createMarginOptimizationStrategy,
    cost_reduction: createCostReductionStrategy,
    quality: createQualityImprovementStrategy,
    risk_mitigation: createRiskMitigationStrategy,
  };
  const fn = map[direction];
  if (!fn) throw new Error(`Unknown strategy direction: ${direction}`);
  return fn(base);
}
