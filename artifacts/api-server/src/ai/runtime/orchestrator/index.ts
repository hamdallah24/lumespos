// ECP-031: Orchestrator — public API
// Single entry point for Runtime dispatch.

export { orchestrator } from "./runtime-orchestrator";
export { resolver } from "./runtime-resolver";
export { checkSystemHealth, getLastHealth } from "./runtime-health";
export type { IRuntime, RuntimeContext } from "./runtime-interface";
export type { RuntimeResult, RuntimeMetrics } from "./runtime-result";
export { createResult, withMetrics } from "./runtime-result";
export { createContext, cloneContext, getUserId, getMode } from "./runtime-context";
export type { RuntimeSource, RuntimeRole } from "./runtime-context";
