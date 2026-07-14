export * from "./types";
export { StrategySimulatorProvider } from "./StrategySimulatorProvider";
export { runSimulation, runSingleVariant } from "./StrategySimulator";
export { buildVariants, buildVariant, variantToPartialContext } from "./ScenarioBuilder";
export { compareSimulations } from "./StrategyComparator";
export { analyzeSensitivity } from "./SensitivityAnalyzer";
export { forecastOutcomes } from "./ForecastEngine";

let initialized = false;

export function initializeStrategySimulator(): void {
  if (initialized) return;
  initialized = true;
  console.log("[SS] Strategy Simulator active — What-If + Comparison + Sensitivity + Forecast ready");
}
