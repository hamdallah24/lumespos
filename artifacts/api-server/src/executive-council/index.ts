export * from "./core";
export * from "./ai-debate";
export * from "./providers";
export * from "./learning";

let initialized = false;

export function initializeExecutiveCouncil(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[EC] Executive Council initialized — Session + Consensus + AI Debate + Learning ready`);
}
