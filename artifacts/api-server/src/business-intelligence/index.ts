export * from "./core";
export * from "./calculators";
export * from "./insight-generators";
export * from "./fact-generators";
export * from "./event-consumers";
export * from "./providers";

import { initializeFactRegistry } from "./core";
import { registerAllInsightGenerators } from "./insight-generators";
import { registerAllFactGenerators } from "./fact-generators";
import { registerAllConsumers } from "./event-consumers";

let initialized = false;

export function initializeBusinessIntelligence(): void {
  if (initialized) return;

  initializeFactRegistry();
  registerAllInsightGenerators();
  registerAllFactGenerators();
  registerAllConsumers();

  initialized = true;

  console.log(`[BI] Initialized — Metric → Insight → Fact pipeline ready`);
}
