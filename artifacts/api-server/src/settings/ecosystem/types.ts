// ConfigCenter — Milestone 6 Phase 4: Ecosystem Operations shared types.
// Ecosystem Operations is a read-heavy observer/coordinator over the locked
// Plugin SDK, Impact Provider SDK, and Marketplace Foundation. It never
// acquires configuration authority (Store/Registry/Resolver/Governance/Pipeline).
// These types define the operational projections, journal records, diagnostics,
// and capabilities exposed by the layer.

import type { PackageManager } from "../marketplace/lifecycle";
import type { PluginManager } from "../plugins/manager";
import type { ImpactProviderRegistry } from "../impact/providers";

// ── Ecosystem Health ──────────────────────────────────────────────────────
export type EcosystemHealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL";

export interface DependencyHealth {
  status: EcosystemHealthStatus;
  missing: number;
  conflicts: number;
  duplicates: number;
  cycles: number;
}

export interface CompatibilityHealth {
  status: EcosystemHealthStatus;
  incompatible: number;
}

export interface CapabilityHealth {
  status: EcosystemHealthStatus;
  provided: number;
  requiredUnmet: number;
}

export interface EcosystemHealthReport {
  status: EcosystemHealthStatus;
  packageRegistry: {
    total: number;
    active: number;
    installed: number;
    invalid: number;
  };
  dependencyHealth: DependencyHealth;
  compatibilityHealth: CompatibilityHealth;
  capabilityHealth: CapabilityHealth;
  lifecycleAnomalies: number;
  reasons: string[];
  checkedAt: number;
}

// ── Package Diagnostics ───────────────────────────────────────────────────
export type DiagnosticSeverity = "error" | "warning";

export type PackageDiagnosticKind =
  | "invalid-manifest"
  | "checksum-mismatch"
  | "missing-dependency"
  | "dependency-conflict"
  | "dependency-cycle"
  | "incompatible-version"
  | "unreachable-dependency"
  | "blocked-removal"
  | "invalid-lifecycle-transition"
  | "orphan-package"
  | "orphan-capability";

export interface PackageDiagnostic {
  package: string;
  version: string;
  kind: PackageDiagnosticKind;
  severity: DiagnosticSeverity;
  message: string;
}

export interface DiagnosticsReport {
  diagnostics: PackageDiagnostic[];
  packageCount: number;
  errorCount: number;
  warningCount: number;
  checkedAt: number;
}

// ── Capability projection ─────────────────────────────────────────────────
export type CapabilitySource = "package" | "plugin" | "impact" | "host";

export interface CapabilityEntry {
  capability: string;
  provider: string;
  source: CapabilitySource;
  version?: string;
  status: "available" | "unavailable";
  compatibility: "ok" | "unknown";
}

// ── Operational Journal ───────────────────────────────────────────────────
export type EcosystemEventType =
  | "package.discovered"
  | "package.validated"
  | "package.install.started"
  | "package.install.completed"
  | "package.install.failed"
  | "package.activated"
  | "package.remove.started"
  | "package.remove.completed"
  | "package.remove.blocked"
  | "package.remove.forced"
  | "package.integrity.failed"
  | "package.dependency.failed";

export interface EcosystemJournalEvent {
  /** Monotonic, append-only sequence number. */
  seq: number;
  type: EcosystemEventType;
  package: string;
  version?: string;
  /** Wall-clock (ms) at append time. */
  timestamp: number;
  /** Caller correlation (stable across a multi-step operation). */
  correlationId?: string;
  /** Caller who triggered the operation (actor-aware). */
  actor?: string;
  /** Human-readable record (e.g. reason, failure detail). */
  detail?: string;
  /** Dependents affected by a (forced) removal. */
  affectedDependents?: string[];
}

export type EcosystemJournalEventInput = Omit<EcosystemJournalEvent, "seq" | "timestamp"> &
  Partial<Pick<EcosystemJournalEvent, "seq" | "timestamp">>;

// ── Lifecycle / operational status ────────────────────────────────────────
export interface PackageOperationalStatus {
  package: string;
  version: string;
  currentState: PackageManagerStatus;
  lastTransition: EcosystemEventType | null;
  lastTransitionAt: number | null;
  installedAt?: number;
  dependencyStatus: "ok" | "degraded" | "broken";
  checksumStatus: "ok" | "missing" | "mismatch";
  failureReason?: string;
}

// Imported at type level to keep the dependency arrow clean.
import type { PackageManager as PkgMgr, PackageStatus } from "../marketplace";
type PackageManagerStatus = PackageStatus;

// ── Ecosystem Operations deps ─────────────────────────────────────────────
export interface EcosystemOperationsDeps {
  packageManager: PackageManager;
  pluginManager?: PluginManager;
  impactRegistry?: ImpactProviderRegistry;
  now?: () => number;
}

export type { PackageStatus };