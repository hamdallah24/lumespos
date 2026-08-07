// ConfigCenter — Change Pipeline.
// Lifecycle (no APPLY): DRAFT → VALIDATE → PREVIEW → SIMULATION → IMPACT →
// POLICY → HEALTH → COMMIT → EVENT PUBLISHED → AUDITED → ACTIVE → SNAPSHOT.
// Runtime reconciles itself by subscribing to notifications. Any gate failure
// aborts the change — nothing is applied partially.

import { ConfigurationRegistry } from "./registry";
import { ConfigSecurity, type WriteActor } from "./security";
import { SettingsStore } from "./store";
import { ConfigEventBus, createConfigurationChangedEvent } from "./events";
import type { ConfigurationResolver } from "./resolver";
import { ConfigMetrics } from "./metrics";
import type { ConfigScope, ConfigValue } from "./types";

export type PipelineState =
  | "DRAFT" | "VALIDATED" | "PREVIEW" | "SIMULATION" | "IMPACT"
  | "POLICY" | "HEALTH" | "COMMIT" | "EVENT_PUBLISHED" | "AUDITED"
  | "ACTIVE" | "SNAPSHOT";

export interface SimulationResult {
  key: string;
  estimate: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export interface PipelineRun {
  correlationId: string;
  state: PipelineState;
  actor: string;
  scope: ConfigScope;
  changes: Record<string, ConfigValue>;
  revision?: number;
  validation?: { ok: boolean; errors: string[] };
  preview?: { ok: boolean; before: Record<string, ConfigValue>; after: Record<string, ConfigValue> };
  simulation?: SimulationResult[];
  impact?: string[];
  policy?: { ok: boolean; reason?: string };
  health?: { ok: boolean; reason?: string };
}

interface PipelineDeps {
  registry: ConfigurationRegistry;
  security: ConfigSecurity;
  resolver: ConfigurationResolver;
  store: SettingsStore;
  bus: ConfigEventBus;
  metrics?: Pick<ConfigMetrics, "increment" | "record">;
  // Optional hooks for subsystem-aware gates (ImpactProvider registration lands later).
  onBeforeCommit?: (run: PipelineRun) => Promise<void> | void;
  onSnapshot?: (run: PipelineRun) => Promise<void> | void;
}

export class ConfigurationPipeline {
  private deps: PipelineDeps;
  private counter = 0;

  constructor(deps: PipelineDeps) {
    this.deps = deps;
  }

  // Evaluate every governance gate up to HEALTH without committing.
  // Shared by run() (which proceeds to COMMIT) and plan() (read-only).
  private async evaluate(params: {
    actor: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
  }, correlationId: string): Promise<PipelineRun> {
    const run: PipelineRun = {
      correlationId,
      state: "DRAFT",
      actor: params.actor.actorId ?? params.actor.role,
      scope: params.scope,
      changes: params.changes,
    };
    const { registry, security, resolver } = this.deps;

    // VALIDATE — schema/format/version + scope coherence + immutable + allowed scope.
    const scopeErrors = security.validateScope(params.scope);
    const fieldErrors: string[] = [];
    for (const [key, value] of Object.entries(params.changes)) {
      try {
        const meta = registry.require(key);
        if (meta.immutable) {
          fieldErrors.push(`${key} is immutable — cannot be overridden`);
          continue;
        }
        if (!meta.scope.includes(params.scope.type)) {
          fieldErrors.push(`${key} cannot be set at scope "${params.scope.type}"`);
          continue;
        }
        for (const e of registry.validateField(key, value)) fieldErrors.push(e.message);
      } catch (err) {
        fieldErrors.push((err as Error).message);
      }
    }
    run.validation = { ok: scopeErrors.length === 0 && fieldErrors.length === 0, errors: [...scopeErrors, ...fieldErrors] };
    if (!run.validation.ok) return run;
    run.state = "VALIDATED";

    // PREVIEW — diff before/after (scrubbed of secrets).
    const before: Record<string, ConfigValue> = {};
    const after: Record<string, ConfigValue> = {};
    if (Object.keys(params.changes).length > 0) {
      const resolvedBefore = await resolver.resolveMany(Object.keys(params.changes), {});
      for (const r of resolvedBefore) before[r.key] = security.scrubValue(r.value, registry.isSecret(r.key));
      for (const key of Object.keys(params.changes)) {
        after[key] = security.scrubValue(params.changes[key], registry.isSecret(key));
      }
    }
    run.preview = { ok: true, before, after };
    run.state = "PREVIEW";

    // SIMULATION — metadata-driven estimate (not exact numbers).
    const simulation: SimulationResult[] = [];
    for (const [key, value] of Object.entries(params.changes)) {
      const meta = registry.get(key)!;
      let estimate = `no behavioral estimate for "${key}"`;
      let confidence: SimulationResult["confidence"] = "low";
      if (meta.type === "number" && /temperature/.test(key)) {
        const beforeNum = Number(before[key] ?? meta.defaultValue);
        const afterNum = Number(value);
        const rising = afterNum > beforeNum;
        estimate = rising
          ? "creativity ↑, determinism ↓, cost ↑ (est.)"
          : "creativity ↓, determinism ↑, cost ↓ (est.)";
        confidence = "medium";
      } else if (meta.restartStrategy === "reload") {
        estimate = "subsystem akan reload (mempengaruhi komponen yang terdaftar)";
        confidence = "medium";
      } else if (meta.restartStrategy === "restart") {
        estimate = "perlu restart process (downtime singkat)";
        confidence = "high";
      } else if (meta.type === "boolean") {
        estimate = `toggle "${meta.title}" = ${String(value)} (subsystem ${value ? "aktif" : "nonaktif"})`;
        confidence = "high";
      }
      simulation.push({ key, estimate, confidence, reason: `metadata-driven estimate (${meta.category}/${meta.restartStrategy})` });
    }
    run.simulation = simulation;
    run.state = "SIMULATION";

    // IMPACT — subsystem-aware via registry dependency edges (ImpactProvider lands later).
    const impactSet = new Set<string>();
    for (const key of Object.keys(params.changes)) {
      const deps = registry.getDependencies(key);
      for (const d of deps) {
        impactSet.add(d.to);
        impactSet.add(d.from);
      }
      const meta = registry.get(key)!;
      if (meta.owner) impactSet.add(meta.owner);
    }
    run.impact = [...impactSet];
    run.state = "IMPACT";

    // POLICY — RBAC deny-wins (simple precedence). High-criticality reject for non-privileged.
    const roleCheck = security.canWrite(params.actor.role, params.scope);
    if (!roleCheck.ok) {
      run.policy = { ok: false, reason: roleCheck.reason };
      return run;
    }
    run.policy = { ok: true };
    run.state = "POLICY";

    // HEALTH — dry-run. M1: no live probes; hooks can extend.
    run.health = { ok: true, reason: "dry-run passed (no live probes configured in M1)" };
    run.state = "HEALTH";

    return run;
  }

  async run(params: {
    actor: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
  }): Promise<PipelineRun> {
    const correlationId = `cfg-${Date.now()}-${(this.counter++).toString(36)}`;
    const run = await this.evaluate(params, correlationId);
    if (!run.validation?.ok || !run.policy?.ok) return run;
    const { store, bus } = this.deps;

    // COMMIT — append immutable revision to store (single source of truth).
    if (this.deps.onBeforeCommit) await this.deps.onBeforeCommit(run);
    const commitStart = performance.now();
    const committed = store.commit(params.scope, params.changes, run.actor, correlationId);
    if (this.deps.metrics) this.deps.metrics.record("commit_latency_ms", performance.now() - commitStart);
    run.revision = committed.revision;
    run.state = "COMMIT";

    // Resolver cache must be invalidated so subscribers read fresh effective values.
    this.deps.resolver.invalidate();

    // EVENT PUBLISHED — notification only (never carries values).
    bus.publish(createConfigurationChangedEvent({
      revision: committed.revision,
      scope: params.scope,
      changedKeys: Object.keys(params.changes),
      actor: run.actor,
      correlationId,
    }));
    if (this.deps.metrics) this.deps.metrics.increment("published_events");
    run.state = "EVENT_PUBLISHED";

    // AUDITED — append-only audit record (persisted via DB hook in later milestones).
    await this.audit(run);
    run.state = "AUDITED";

    run.state = "ACTIVE";

    // SNAPSHOT — optional hook for retention/GC (Milestone 6).
    if (this.deps.onSnapshot) await this.deps.onSnapshot(run);
    run.state = "SNAPSHOT";

    return run;
  }

  // Read-only governance plan — evaluates every gate but NEVER commits.
  // Used by preview/simulate/impact/policy-check endpoints. The result stops
  // at HEALTH; no revision is produced and the store is untouched.
  async plan(params: {
    actor: WriteActor;
    scope: ConfigScope;
    changes: Record<string, ConfigValue>;
  }): Promise<PipelineRun> {
    const correlationId = `cfg-plan-${Date.now()}-${(this.counter++).toString(36)}`;
    return this.evaluate(params, correlationId);
  }

  private async audit(run: PipelineRun): Promise<void> {
    // Placeholder — persisted to settings_audit via drizzle in a later milestone.
    return;
  }
}
