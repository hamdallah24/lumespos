export * from "./core";
export * from "./strategies";
export * from "./providers";

let initialized = false;

export function initializeStrategyEngine(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[SE] Strategy Engine initialized — Situation → Objective pipeline ready`);
}
