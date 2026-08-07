// ConfigCenter — Milestone 6 Phase 4: Ecosystem Operations barrel.
// Read-heavy operational observer/coordinator over the locked Plugin/Impact/
// Marketplace SDKs. Additive, consumer-only. Does NOT take config authority.

export { EcosystemJournal } from "./journal";
export { ECOSYSTEM_EVENT_TYPES, isEcosystemEventType } from "./journal-types";
export { EcosystemHealth } from "./health";
export { EcosystemDiagnostics } from "./diagnostics";
export { EcosystemExplorer, PackageCapabilitySource, type CapabilitySourceAdapter } from "./explorer";
export { EcosystemOperations, type LifecycleOperationContext, type ForceRemoveContext, type OperationResult } from "./operations";

export type {
  EcosystemHealthReport,
  EcosystemHealthStatus,
  EcosystemOperationsDeps,
  EcosystemJournalEvent,
  EcosystemJournalEventInput,
  EcosystemEventType,
  PackageOperationalStatus,
  PackageDiagnostic,
  PackageDiagnosticKind,
  DiagnosticSeverity,
  DiagnosticsReport,
  CapabilityEntry,
  CapabilitySource,
} from "./types";