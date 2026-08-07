// ConfigCenter — Milestone 6 Phase 2: Impact Provider SDK barrel.
// Consumer-only impact extension on top of the locked Pipeline's read-only
// plan(). Providers assess changed keys; the analyzer enriches simulation and
// expands the impacted-subsystem set. No write authority is granted.

export {
  ImpactProviderRegistry,
  registerImpactProvider,
  unregisterImpactProvider,
  type ProviderMatch,
  type CapabilityDiscoveryResult,
} from "./providers";

export {
  ImpactAnalyzer,
  type ImpactAnalyzerDeps,
} from "./analyzer";

export type {
  ImpactChange,
  ImpactSeverity,
  ImpactEstimate,
  ImpactProviderDefinition,
  ImpactReport,
  ImpactAnalyzeInput,
} from "./types";