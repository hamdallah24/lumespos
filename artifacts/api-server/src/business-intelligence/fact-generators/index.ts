export { registerThresholdFactGenerator } from "./ThresholdFactGenerator";
export { registerAnomalyFactGenerator } from "./AnomalyFactGenerator";
export { registerTrendFactGenerator } from "./TrendFactGenerator";

import { registerThresholdFactGenerator } from "./ThresholdFactGenerator";
import { registerAnomalyFactGenerator } from "./AnomalyFactGenerator";
import { registerTrendFactGenerator } from "./TrendFactGenerator";

export function registerAllFactGenerators(): void {
  registerThresholdFactGenerator();
  registerAnomalyFactGenerator();
  registerTrendFactGenerator();
}
