export { registerCoverageInsightGenerator } from "./CoverageInsightGenerator";
export { registerGrowthInsightGenerator } from "./GrowthInsightGenerator";
export { registerTrendInsightGenerator } from "./TrendInsightGenerator";
export { registerAnomalyInsightGenerator } from "./AnomalyInsightGenerator";

import { registerCoverageInsightGenerator } from "./CoverageInsightGenerator";
import { registerGrowthInsightGenerator } from "./GrowthInsightGenerator";
import { registerTrendInsightGenerator } from "./TrendInsightGenerator";
import { registerAnomalyInsightGenerator } from "./AnomalyInsightGenerator";

export function registerAllInsightGenerators(): void {
  registerCoverageInsightGenerator();
  registerGrowthInsightGenerator();
  registerTrendInsightGenerator();
  registerAnomalyInsightGenerator();
}
