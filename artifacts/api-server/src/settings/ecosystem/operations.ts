// ConfigCenter — Milestone 6 Phase 4: Lifecycle Operations + Ecosystem
// Operations facade. Monitors package lifecycle and coordinates operational
// actions through the LOCKED PackageManager public surface. Force removal is
// NOT a silent bypass: EcosystemOperations enriches the call site with actor +
// reason and ALWAYS records package.remove.forced in the operational journal.
// This layer never takes over commit/governance/revision/resolver authority.

import { PackageManager, type InstallResult, type RemoveResult } from "../marketplace/lifecycle";
import type { PackageStatus } from "../marketplace/registry";
import { manifestChecksum } from "../marketplace/manifest";
import { EcosystemJournal } from "./journal";
import type {
  EcosystemJournalEventInput,
  EcosystemJournalEvent,
  EcosystemOperationsDeps,
  PackageOperationalStatus,
  EcosystemEventType,
} from "./types";

export interface LifecycleOperationContext {
  actor?: string;
  correlationId?: string;
}

export interface ForceRemoveContext extends LifecycleOperationContext {
  /** Required for force removal — the explicit reason. */
  reason: string;
}

export interface OperationResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

export class EcosystemOperations {
  private readonly manager: PackageManager;
  private readonly journal: EcosystemJournal;
  private readonly now: () => number;

  constructor(deps: EcosystemOperationsDeps) {
    this.manager = deps.packageManager;
    this.journal = deps.now ? new EcosystemJournal({ now: deps.now }) : new EcosystemJournal();
    this.now = deps.now ?? Date.now;
  }

  /** The operational journal backing this operations layer. */
  journalInstance(): EcosystemJournal {
    return this.journal;
  }

  /** Operational projection for one package (or all). Read-only. */
  status(packageName?: string): PackageOperationalStatus[] {
    const entries = this.manager.registry.list();
    const targets = packageName != null ? entries.filter((e) => e.manifest.name === packageName) : entries;
    return targets.map((e) => this.project(e.manifest.name, e.manifest.version));
  }

  /** Install through the PackageManager public surface, journaled. */
  install(name: string, version?: string, ctx: LifecycleOperationContext = {}): OperationResult<InstallResult> {
    const correlationId = ctx.correlationId ?? this.generateId();
    const versionLabel = version ?? "*";
    this.journal.append(this.event("package.install.started", name, version, correlationId, ctx.actor));
    const result = this.manager.install(name, version);
    if (!result.ok) {
      this.journal.append(this.event("package.install.failed", name, versionLabel, correlationId, ctx.actor, result.message));
      return { ok: false, error: result.message };
    }
    this.journal.append(this.event("package.install.completed", name, result.version, correlationId, ctx.actor, undefined, result.installOrder));
    this.journal.append(this.event("package.activated", name, result.version, correlationId, ctx.actor));
    return { ok: true, result };
  }

  /** Remove through the PackageManager public surface, journaled. */
  remove(name: string, version?: string, ctx: LifecycleOperationContext = {}): OperationResult<RemoveResult> {
    const correlationId = ctx.correlationId ?? this.generateId();
    const versionLabel = version ?? "*";
    this.journal.append(this.event("package.remove.started", name, version, correlationId, ctx.actor));
    const result = this.manager.remove(name, version, "blocking");
    if (!result.ok) {
      this.journal.append(this.event("package.remove.blocked", name, versionLabel, correlationId, ctx.actor, result.message));
      return { ok: false, error: result.message };
    }
    this.journal.append(this.event("package.remove.completed", name, versionLabel, correlationId, ctx.actor, undefined, result.removalOrder));
    return { ok: true, result };
  }

  /** Explicit, reason-aware, fully-journaled force removal. Never silent. */
  forceRemove(name: string, version?: string, ctx: ForceRemoveContext = { reason: "unspecified" }): OperationResult<RemoveResult> {
    const correlationId = ctx.correlationId ?? this.generateId();
    const versionLabel = version ?? "*";
    if (!ctx.reason || ctx.reason.length === 0) {
      const err = "force removal requires an explicit reason";
      this.journal.append(this.event("package.remove.blocked", name, versionLabel, correlationId, ctx.actor, err));
      return { ok: false, error: err };
    }
    // capture affected dependents BEFORE removal for the audit record
    const affected = this.affectedDependents(name, version);
    this.journal.append(this.event("package.remove.forced", name, versionLabel, correlationId, ctx.actor, ctx.reason, affected));
    const result = this.manager.remove(name, version, "force");
    if (!result.ok) {
      this.journal.append(this.event("package.remove.blocked", name, versionLabel, correlationId, ctx.actor, result.message));
      return { ok: false, error: result.message };
    }
    this.journal.append(this.event("package.remove.completed", name, versionLabel, correlationId, ctx.actor, undefined, result.removalOrder));
    return { ok: true, result };
  }

  /** Read-only journal access (chronological, immutable copies). */
  events(): readonly EcosystemJournalEvent[] {
    return this.journal.list();
  }

  private project(name: string, version: string): PackageOperationalStatus {
    const status = this.manager.registry.status(name, version) ?? "discovered";
    const last = this.lastTransition(name);
    const depStatus = this.dependencyStatus(name);
    const checksumStatus = this.checksumStatus(name, version);
    return {
      package: name,
      version,
      currentState: status,
      lastTransition: last?.type ?? null,
      lastTransitionAt: last?.timestamp ?? null,
      installedAt: this.manager.registry.installedAtOf(name, version),
      dependencyStatus: depStatus,
      checksumStatus,
      failureReason: this.lastFailure(name),
    };
  }

  private lastTransition(name: string): { type: EcosystemEventType; timestamp: number } | undefined {
    const events = this.journal.byPackage(name);
    if (events.length === 0) return undefined;
    const last = events[events.length - 1];
    return { type: last.type, timestamp: last.timestamp };
  }

  private lastFailure(name: string): string | undefined {
    const events = this.journal.byPackage(name);
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i];
      if (e.type === "package.install.failed" || e.type === "package.remove.blocked" || e.type === "package.integrity.failed" || e.type === "package.dependency.failed") {
        return e.detail;
      }
    }
    return undefined;
  }

  private dependencyStatus(name: string): "ok" | "degraded" | "broken" {
    const entry = this.manager.registry.list().find((e) => e.manifest.name === name);
    if (!entry) return "ok";
    const deps = [...(entry.manifest.dependencies ?? []), ...(entry.manifest.peerDependencies ?? [])];
    if (deps.length === 0) return "ok";
    const statuses = this.manager.registry.list().reduce<Map<string, PackageStatus>>((m, e) => {
      m.set(e.manifest.name, e.status);
      return m;
    }, new Map());
    const present = deps.filter((d) => statuses.has(d.name));
    if (present.length < deps.length) return "broken";
    const inactive = present.filter((d) => { const s = statuses.get(d.name); return s !== "active" && s !== "installed"; });
    if (inactive.length > 0) return "degraded";
    return "ok";
  }

  private checksumStatus(name: string, version: string): "ok" | "missing" | "mismatch" {
    const manifest = this.manager.registry.getVersion(name, version);
    if (!manifest || manifest.checksum == null) return "missing";
    return manifestChecksum(manifest) === manifest.checksum ? "ok" : "mismatch";
  }

  private affectedDependents(name: string, version?: string): string[] {
    return this.manager.registry
      .list()
      .filter((e) => e.manifest.name !== name &&
        [...(e.manifest.dependencies ?? []), ...(e.manifest.peerDependencies ?? [])].some((d) => d.name === name) &&
        (e.status === "active" || e.status === "installed" || e.status === "resolved"))
      .map((e) => e.manifest.name)
      .sort();
  }

  private event(
    type: EcosystemEventType,
    packageName: string,
    version: string | undefined,
    correlationId: string,
    actor?: string,
    detail?: string,
    affectedDependents?: string[],
  ): EcosystemJournalEventInput {
    return { type, package: packageName, version, correlationId, actor, detail, affectedDependents };
  }

  private generateId(): string {
    return `op-${this.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
