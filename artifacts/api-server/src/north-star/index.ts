export * from "./NorthStarConfiguration";
export * from "./StrategyEvaluator";
export * from "./ScoreCalculator";
export * from "./providers";
import { NorthStarProvider } from "./providers/NorthStarProvider";

let initialized = false;

export function initializeNorthStar(): void {
  if (initialized) return;
  initialized = true;
  NorthStarProvider.applyCurrentQuarter();
  console.log(`[NS] North Star initialized — Configuration + Evaluator + Score Calculator ready`);
}
