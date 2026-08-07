// ConfigCenter — Milestone 6 Phase 3: Marketplace Foundation barrel.
// Package manifest + registry + dependency graph + integrity checksum +
// install/remove lifecycle. Deliberately isolated from the Configuration
// Registry (src/settings/registry.ts) — it never takes over commit, governance,
// revision, resolver or pipeline authority.

export {
  validatePackageManifest,
  canonicalManifest,
  manifestChecksum,
  payloadChecksum,
  artifactChecksum,
  PACKAGE_MANIFEST_VERSION,
  type PackageManifest,
  type PackageType,
  type PackageDependency,
  type PackageCompatibility,
  type PackageConfigExtension,
  type ManifestValidation,
  type ManifestIssue,
} from "./manifest";

export {
  resolveDependencyGraph,
  type GraphNode,
  type GraphEdge,
  type GraphIssue,
  type GraphValidation,
} from "./dependencies";

export {
  PackageRegistry,
  type PackageEntry,
  type PackageStatus,
  type VersionResolution,
} from "./registry";

export {
  PackageManager,
  type InstallResult,
  type RemoveResult,
  type RemovalPolicy,
  type PackageManagerOptions,
} from "./lifecycle";