export * from "./core";
export * from "./rule-engine";
export * from "./ai-engine";

import { registerAllRules } from "./rule-engine";

let initialized = false;

export function initializeOperationalDecisionEngine(): void {
  if (initialized) return;

  registerAllRules();

  initialized = true;

  console.log(`[ODE] Initialized — Rule Engine + AI Engine ready`);
}
