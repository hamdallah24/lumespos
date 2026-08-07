// ConfigCenter — Milestone 6 Phase 1: Plugin SDK barrel.
// Consumer-only plugin surface on top of locked contracts. Plugins read config
// through the SDK reader and receive change notifications; they never acquire
// write authority over the Store/Pipeline/Registry.

export {
  PluginManager,
  type PluginManagerOptions,
} from "./manager";

export {
  PluginRegistry,
} from "./registry";

export {
  CapabilityRegistry,
  type CapabilityProvider,
} from "./capabilities";

export {
  VersionCompatibility,
  type CompatibilityResult,
} from "./compatibility";

export {
  validateDependencies,
  type DependencyValidation,
  type DependencyIssue,
} from "./dependencies";

export {
  validatePluginManifest,
  KNOWN_HOOKS,
  isSemverRange,
  type ManifestValidation,
  type ManifestIssue,
} from "./manifest";

export {
  canTransition,
  assertTransition,
  type LifecycleTransition,
} from "./lifecycle";

export {
  parseVersion,
  isSemver,
  compareVersions,
  satisfiesVersion,
  type SemVer,
} from "./semver";

export type {
  PluginStatus,
  PluginHook,
  PluginDependency,
  PluginManifest,
  PluginRuntimeContext,
  PluginImplementation,
  PluginRegistration,
  PluginReport,
} from "./types";
