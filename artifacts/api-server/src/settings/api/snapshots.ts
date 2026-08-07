// ConfigCenter — Snapshot Manager (Milestone 3, persistent).
// Creates immutable, verifiable Configuration snapshots. A snapshot is the
// Resolver's effective configuration for a scope captured at a revision.
//
// Persistence is injected (SQL operational path | memory for tests/dev) — all
// capture/retention/GC/verification/restore logic is persistence-agnostic.
//
// Restore NEVER touches the Store directly. It always:
//   Verify → Preview → Diff → Impact → Policy → Health → Commit (new revision)
//   → ConfigurationChanged → Subscriber reconcile   (via Governance Pipeline)
// The snapshot's effective payload becomes a NEW commit, keeping history linear.
//
// The Milestone 2 convenience surface (list/get/search/count) stays SYNCHRONOUS
// over an in-memory mirror (write-through) so the M2 contract and REST handler
// keep working unchanged; persistence happens behind the same operations.

import { randomUUID } from "crypto";
import { REGISTRY_CONFIG_VERSION } from "../defaults";
import type {
  ConfigScope,
  ConfigValue,
} from "../types";
import type { SettingsStore } from "../store";
import type { ConfigurationResolver } from "../resolver";
import type { ConfigurationPipeline } from "../pipeline";
import type { WriteActor } from "../security";
import type { ConfigurationRegistry } from "../registry";
import {
  MemorySnapshotPersistence,
  SnapshotVerifier,
  RetentionManager,
  GarbageCollector,
  type SnapshotPersistence,
  type SnapshotRecord,
  type RetentionPolicy,
  type GcAuditEvent,
  type SnapshotOrigin,
  type VerificationResult,
} from "./snapshot";
import { payloadChecksum } from "./snapshot/checksum";

export interface SnapshotManagerDeps {
  store: SettingsStore;
  resolver: ConfigurationResolver;
  pipeline: ConfigurationPipeline;
  registry?: ConfigurationRegistry;
  persistence?: SnapshotPersistence;
}

// Derive a ResolutionContext from a ConfigScope for effective resolution.
function contextFor(scope: ConfigScope) {
  return {
    workspaceId: scope.type === "workspace" ? scope.workspaceId ?? null : null,
    branchId: scope.type === "branch" ? scope.branchId ?? null : null,
    executiveRole: scope.type === "executive" ? scope.executiveRole ?? null : null,
  };
}

// Map an origin onto its triggerType word form (identical set, DB-storage form).
function toTriggerType(origin: SnapshotOrigin): SnapshotRecord["triggerType"] {
  switch (origin) {
    case "pre-deploy": return "pre_deploy";
    case "manual": return "manual";
    case "automatic": return "automatic";
    case "scheduled": return "scheduled";
    case "rollback": return "rollback";
    case "migration": return "migration";
  }
}

export class SnapshotManager {
  private readonly deps: SnapshotManagerDeps;
  private readonly persistence: SnapshotPersistence;
  private readonly retention: RetentionManager;
  private readonly gc: GarbageCollector;
  private readonly verifier: SnapshotVerifier;
  // Write-through mirror keeps the M2 sync surface + SQL persistence consistent.
  private readonly mirror = new Map<string, SnapshotRecord>();

  constructor(deps: SnapshotManagerDeps) {
    this.deps = deps;
    this.persistence = deps.persistence ?? new MemorySnapshotPersistence();
    this.retention = new RetentionManager();
    this.gc = new GarbageCollector({ persistence: this.persistence, retention: this.retention });
    this.verifier = new SnapshotVerifier({ registry: deps.registry ?? null });
  }

  // ── Capture ─────────────────────────────────────────────────────────────
  // Snapshot the Resolver's effective configuration for a scope.
  async capture(opts: {
    name: string;
    scope: ConfigScope;
    actor: string;
    origin?: SnapshotOrigin;
    environment?: string;
    reason?: string;
    correlationId?: string;
    pipelineStage?: string;
  }): Promise<SnapshotRecord> {
    const overrides = await this.deps.store.loadOverrides();
    const changes: Record<string, ConfigValue> = {};
    for (const set of overrides) {
      if (set.scope.type !== opts.scope.type) continue;
      if (opts.scope.type === "workspace" && set.scope.workspaceId !== opts.scope.workspaceId) continue;
      if (opts.scope.type === "branch" && set.scope.branchId !== opts.scope.branchId) continue;
      if (opts.scope.type === "executive" && set.scope.executiveRole !== opts.scope.executiveRole) continue;
      Object.assign(changes, set.values);
    }

    // Payload = Resolver effective configuration (the snapshot artifact).
    const payload = await this.deps.resolver.effective(contextFor(opts.scope));
    const revisionNo = await this.deps.store.currentRevision();
    const registryChecksum = this.deps.registry && this.deps.registry.isFrozen ? this.deps.registry.getChecksum() : "";

    const checksum = payloadChecksum(payload);
    const origin: SnapshotOrigin = opts.origin ?? "manual";

    const record: SnapshotRecord = {
      id: randomUUID(),
      name: opts.name,
      environment: opts.environment ?? "development",
      scope: { ...opts.scope },
      revisionNo,
      configVersion: REGISTRY_CONFIG_VERSION,
      checksum,
      registryChecksum,
      fingerprint: {
        checksum,
        registryChecksum,
        configVersion: REGISTRY_CONFIG_VERSION,
        revisionNo,
      },
      payload,
      changes,
      origin,
      triggerType: toTriggerType(origin),
      status: "ACTIVE",
      pinned: false,
      createdAt: new Date().toISOString(),
      metadata: {
        actor: opts.actor,
        correlationId: opts.correlationId,
        pipelineStage: opts.pipelineStage,
        reason: opts.reason,
        sourceRevision: revisionNo,
      },
    };

    await this.persistence.save(record);
    this.mirror.set(record.id, record);
    return record;
  }

  // Milestone 2 synchronous convenience surface (backed by the mirror).
  list(): SnapshotRecord[] {
    return [...this.mirror.values()]
      .map((r) => ({ ...r, payload: { ...r.payload }, changes: { ...r.changes } }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): SnapshotRecord | undefined {
    const row = this.mirror.get(id);
    return row ? { ...row, payload: { ...row.payload }, changes: { ...row.changes } } : undefined;
  }

  search(query: string): SnapshotRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.metadata.actor.toLowerCase().includes(q) ||
        s.origin.includes(q),
    );
  }

  count(): number {
    return this.mirror.size;
  }

  // Compare two snapshots (field-level diff of effective payloads). Pure read.
  compare(aId: string, bId: string): Array<{
    key: string;
    a: ConfigValue;
    b: ConfigValue;
    changed: boolean;
  }> {
    const a = this.get(aId);
    const b = this.get(bId);
    if (!a || !b) return [];
    const keys = new Set([...Object.keys(a.payload), ...Object.keys(b.payload)]);
    const out: Array<{ key: string; a: ConfigValue; b: ConfigValue; changed: boolean }> = [];
    for (const key of keys) {
      const av = a.payload[key];
      const bv = b.payload[key];
      out.push({ key, a: av, b: bv, changed: JSON.stringify(av) !== JSON.stringify(bv) });
    }
    return out;
  }

  // Restore VERIFICATION — everything must pass before a restore reaches the pipeline.
  // Reads from the AUTHORITATIVE persistence store (source of truth) so integrity
  // tampering is detected even when a mirror copy exists.
  async verify(id: string): Promise<VerificationResult> {
    const snapshot = await this.persistence.findById(id);
    return this.verifier.verify(snapshot);
  }

  // Restore a snapshot via the Governance Pipeline → new commit, new revision.
  // History stays linear: the snapshot's payload is committed as a new revision,
  // never reactivating the old revision.
  async restore(opts: {
    id: string;
    actor: WriteActor;
  }): Promise<{ revision: number; correlationId: string }> {
    const snapshot = await this.persistence.findById(opts.id);
    if (!snapshot) throw new Error("snapshot not found");

    // 1. Verification gates every restore.
    const verification = this.verifier.verify(snapshot);
    if (!verification.ok) {
      throw new Error(`snapshot verification failed: ${verification.reasons.join("; ")}`);
    }

    // 2. Governance Pipeline (Preview → Diff → Impact → Policy → Health → Commit).
    // Replays the captured override set (`changes`) — scope-valid, restoring the
    // same intent as at capture. The full effective payload stays the immutable
    // verifiable artifact (used for compare/integrity), not a blind re-commit.
    const run = await this.deps.pipeline.run({
      actor: opts.actor,
      scope: snapshot.scope,
      changes: snapshot.changes,
    });
    if (!run.validation?.ok) throw new Error(run.validation?.errors.join("; ") ?? "validation failed");
    if (!run.policy?.ok) throw new Error(run.policy?.reason ?? "restore denied by policy");
    if (run.revision == null) throw new Error("restore did not produce a revision");

    // 3. Mark source snapshot as RESTORED (metadata only — payload unchanged).
    await this.persistence.updateStatus(snapshot.id, "RESTORED");
    const updated = this.mirror.get(snapshot.id);
    if (updated) updated.status = "RESTORED";

    return { revision: run.revision, correlationId: run.correlationId };
  }

  // ── Pin / Retention / GC ────────────────────────────────────────────────

  async pin(id: string): Promise<void> {
    await this.persistence.setPinned(id, true);
    const row = this.mirror.get(id);
    if (row) { row.pinned = true; row.status = "PINNED"; }
  }

  async unpin(id: string): Promise<void> {
    await this.persistence.setPinned(id, false);
    const row = this.mirror.get(id);
    if (row) { row.pinned = false; if (row.status === "PINNED") row.status = "ACTIVE"; }
  }

  setRetentionPolicy(policy: Partial<RetentionPolicy>): RetentionPolicy {
    this.retention.updatePolicy(policy);
    return this.retention.getPolicy();
  }

  getRetentionPolicy(): RetentionPolicy {
    return this.retention.getPolicy();
  }

  retentionCandidates(): SnapshotRecord[] {
    return this.retention.candidates(this.list());
  }

  async runGc(): Promise<GcAuditEvent> {
    const event = await this.gc.run();
    // Sync mirror to persistence after removal.
    const remaining = await this.persistence.list();
    this.mirror.clear();
    for (const r of remaining) this.mirror.set(r.id, r);
    return event;
  }

  get gcAuditEvents(): readonly GcAuditEvent[] {
    return this.gc.auditEvents;
  }
}