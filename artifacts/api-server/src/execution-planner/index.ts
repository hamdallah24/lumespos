export * from "./core";
export * from "./templates";
export * from "./providers";
export { PlanProvider } from "./providers";

let initialized = false;

export function initializeExecutionPlanner(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[EP] Execution Planner initialized — Graph Builder + Templates + Plan Provider ready`);
}
