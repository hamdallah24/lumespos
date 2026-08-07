// ConfigCenter — Milestone 3 Phase 1: Persistent Snapshot Foundation tests.
// Verifies: SQL-backed persistence contract, immutability, fingerprint, origin/
// status/metadata, retention policy, garbage collection (with audit events),
// restore verification (exists/checksum/configVersion/payload/registry), and the
// restore workflow staying strictly inside the Governance Pipeline (new revision,
// linear history). Golden Contract + M2 tests must remain untouched.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import { SnapshotVerifier } from "../../../src/settings/api/snapshot";
import { RetentionManager } from "../../../src/settings/api/snapshot";
import { GarbageCollector } from "../../../src/settings/api/snapshot";
import { payloadChecksum } from "../../../src/settings/api/snapshot";
import type { SnapshotRecord } from "../../../src/settings/api/snapshot";
import { SettingsStore } from "../../../src/settings/store";
import { ConfigurationResolver } from "../../../src/settings/resolver";
import { ConfigurationPipeline } from "../../../src/settings/pipeline";
import { ConfigSecurity } from "../../../src/settings/security";
import { ConfigEventBus } from "../../../src/settings/events";

let center: ConfigCenter;
let manager: SnapshotManager;
let persistence: MemorySnapshotPersistence;

beforeAll(async () => {
  center = await initConfigCenter();
  persistence = new MemorySnapshotPersistence();
  manager = new SnapshotManager({
    store: center.store,
    resolver: center.resolver,
    pipeline: center.pipeline,
    registry: center.registry,
    persistence,
  });
});

// ── 1. SQL-backed persistence contract ────────────────────────────────────
describe("Snapshot persistence — SQL-backed contract via injected store", () => {
  it("snapshot is saved to the injected persistence (SQL contract)", async () => {
    const snap = await manager.capture({ name: "p1-commit", scope: { type: "workspace", workspaceId: 1 }, actor: "owner" });
    const fromStore = await persistence.findById(snap.id);
    expect(fromStore).not.toBeNull();
    expect(fromStore!.id).toBe(snap.id);
    expect(fromStore!.payload).toEqual(snap.payload);
  });

  it("persistence refuses to overwrite an existing snapshot (immutable)", async () => {
    const snap = await manager.capture({ name: "p1-immutable", scope: { type: "workspace", workspaceId: 2 }, actor: "owner" });
    await expect(persistence.save(snap)).rejects.toThrow(/already exists \(immutable\)/);
  });

  it("payload is the Resolver effective configuration (44 declared keys)", async () => {
    const snap = await manager.capture({ name: "p1-effective", scope: { type: "workspace", workspaceId: 3 }, actor: "owner" });
    expect(Object.keys(snap.payload).length).toBe(center.registry.list().length);
  });
});

// ── 2. Fingerprint / origin / status / metadata ───────────────────────────
describe("Snapshot fingerprint, origin, status, metadata", () => {
  it("fingerprint carries checksum + registry checksum + configVersion + revisionNo", async () => {
    const snap = await manager.capture({ name: "p2-fp", scope: { type: "workspace", workspaceId: 4 }, actor: "owner" });
    expect(snap.fingerprint.checksum).toBe(snap.checksum);
    expect(snap.fingerprint.registryChecksum).toBe(center.registry.getChecksum());
    expect(snap.fingerprint.configVersion).toBe(1);
    expect(snap.fingerprint.revisionNo).toBe(snap.revisionNo);
    expect(payloadChecksum(snap.payload)).toBe(snap.checksum);
  });

  it("origin is recorded and mapped to a triggerType", async () => {
    const snap = await manager.capture({
      name: "p2-origin",
      scope: { type: "workspace", workspaceId: 5 },
      actor: "owner",
      origin: "pre-deploy",
      reason: "pre-release baseline",
      environment: "staging",
    });
    expect(snap.origin).toBe("pre-deploy");
    expect(snap.triggerType).toBe("pre_deploy");
    expect(snap.environment).toBe("staging");
    expect(snap.metadata.reason).toBe("pre-release baseline");
    expect(snap.metadata.actor).toBe("owner");
    expect(snap.metadata.sourceRevision).toBe(snap.revisionNo);
  });

  it("status defaults to ACTIVE and payload is never altered by status", async () => {
    const snap = await manager.capture({ name: "p2-status", scope: { type: "workspace", workspaceId: 6 }, actor: "owner" });
    expect(snap.status).toBe("ACTIVE");
    await manager.pin(snap.id);
    const pinned = await manager.get(snap.id);
    expect(pinned!.status).toBe("PINNED");
    expect(pinned!.pinned).toBe(true);
    expect(pinned!.payload).toEqual(snap.payload);
  });
});

// ── 3. Retention policy ───────────────────────────────────────────────────
describe("Retention Manager — keep latest N, keep younger than X days, pin-safe", () => {
  it("candidates = older-than-keepLatest in a bucket, newest kept", async () => {
    const retention = new RetentionManager({ keepLatest: 2, keepYoungerThanDays: 0 });
    const mk = (id: string, daysAgo: number): SnapshotRecord => ({
      id,
      name: id,
      environment: "development",
      scope: { type: "workspace", workspaceId: 1 },
      revisionNo: 1,
      configVersion: 1,
      checksum: "x",
      registryChecksum: "r",
      fingerprint: { checksum: "x", registryChecksum: "r", configVersion: 1, revisionNo: 1 },
      payload: {},
      changes: {},
      origin: "manual",
      triggerType: "manual",
      status: "ACTIVE",
      pinned: false,
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      metadata: { actor: "owner" },
    });
    const snapshots = [mk("a", 10), mk("b", 5), mk("c", 1), mk("d", 0)];
    const c = retention.candidates(snapshots);
    expect(c.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("pinned snapshots are never candidates (age-based)", async () => {
    const retention = new RetentionManager({ keepLatest: 0, keepYoungerThanDays: 7 });
    const base = (id: string, createdAt: string, pinned: boolean): SnapshotRecord => ({
      id, name: id, environment: "development", scope: { type: "workspace", workspaceId: 1 },
      revisionNo: 1, configVersion: 1, checksum: "x", registryChecksum: "r",
      fingerprint: { checksum: "x", registryChecksum: "r", configVersion: 1, revisionNo: 1 },
      payload: {}, changes: {}, origin: "manual", triggerType: "manual",
      status: pinned ? "PINNED" : "ACTIVE", pinned, createdAt,
      metadata: { actor: "owner" },
    });
    const victim = base("victim", new Date(Date.now() - 30 * 86400000).toISOString(), false);
    const pinned = base("keep", new Date(Date.now() - 60 * 86400000).toISOString(), true);
    const c = retention.candidates([pinned, victim]);
    expect(c.map((s) => s.id)).toEqual(["victim"]);
  });

  it("referenced snapshots (rollback/audit) are never candidates", async () => {
    const retention = new RetentionManager({ keepLatest: 1, keepYoungerThanDays: 0 });
    const base = (id: string, createdAt: string, status: string): SnapshotRecord => ({
      id, name: id, environment: "development", scope: { type: "workspace", workspaceId: 1 },
      revisionNo: 1, configVersion: 1, checksum: "x", registryChecksum: "r",
      fingerprint: { checksum: "x", registryChecksum: "r", configVersion: 1, revisionNo: 1 },
      payload: {}, changes: {}, origin: "rollback", triggerType: "rollback",
      status: status as SnapshotRecord["status"], pinned: false, createdAt,
      metadata: { actor: "owner", sourceRevision: 1 },
    });
    const victim = base("victim", new Date(Date.now() - 20 * 86400000).toISOString(), "ACTIVE");
    const restored = base("restored", new Date(Date.now() - 1 * 86400000).toISOString(), "RESTORED");
    const archived = base("archived", new Date(Date.now() - 40 * 86400000).toISOString(), "ARCHIVED");
    const c = retention.candidates([victim, restored, archived]);
    expect(c.map((s) => s.id)).toEqual(["victim"]);
  });

  it("age-based retention collects snapshots older than X days", async () => {
    const retention = new RetentionManager({ keepLatest: 0, keepYoungerThanDays: 7 });
    const base = (id: string, daysAgo: number): SnapshotRecord => ({
      id, name: id, environment: "development", scope: { type: "workspace", workspaceId: 1 },
      revisionNo: 1, configVersion: 1, checksum: "x", registryChecksum: "r",
      fingerprint: { checksum: "x", registryChecksum: "r", configVersion: 1, revisionNo: 1 },
      payload: {}, changes: {}, origin: "manual", triggerType: "manual",
      status: "ACTIVE", pinned: false, createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      metadata: { actor: "owner" },
    });
    const c = retention.candidates([base("new", 1), base("old", 20)]);
    expect(c.map((s) => s.id)).toEqual(["old"]);
  });
});

// ── 4. Garbage collection ─────────────────────────────────────────────────
describe("Garbage Collector — deletes only passable, unpinned, unreferenced", () => {
  it("GC removes victims and emits an audit event", async () => {
    const store = new SettingsStore();
    const sec = new ConfigSecurity(center.registry);
    const res = new ConfigurationResolver(center.registry, store);
    const bus = new ConfigEventBus();
    const pipeline = new ConfigurationPipeline({ registry: center.registry, security: sec, resolver: res, store, bus });
    const mem = new MemorySnapshotPersistence();
    const retention = new RetentionManager({ keepLatest: 2, keepYoungerThanDays: 0 });
    const gc = new GarbageCollector({ persistence: mem, retention });
    const mgr = new SnapshotManager({ store, resolver: res, pipeline, registry: center.registry, persistence: mem });

    for (let i = 1; i <= 4; i++) {
      const snap = await mgr.capture({
        name: `gc-${i}`,
        scope: { type: "workspace", workspaceId: 10 },
        actor: "owner",
        environment: "development",
      });
      await mem.remove([snap.id]);
      await mem.save({ ...snap, createdAt: new Date(Date.now() - (4 - i) * 86400000).toISOString() });
    }
    const before = await mem.count();
    expect(before).toBe(4);

    const event = await gc.run();
    expect(event.type).toBe("snapshot.gc");
    expect(event.collected).toBe(2); // keepLatest=2 → 2 oldest removed
    expect(event.snapshotIds.length).toBe(2);
    expect(await mem.count()).toBe(2);
    expect(gc.auditEvents.length).toBe(1);
  });

  it("GC never deletes pinned snapshots", async () => {
    const store = new SettingsStore();
    const sec = new ConfigSecurity(center.registry);
    const res = new ConfigurationResolver(center.registry, store);
    const bus = new ConfigEventBus();
    const pipeline = new ConfigurationPipeline({ registry: center.registry, security: sec, resolver: res, store, bus });
    const mem = new MemorySnapshotPersistence();
    const retention = new RetentionManager({ keepLatest: 1, keepYoungerThanDays: 0 });
    const gc = new GarbageCollector({ persistence: mem, retention });
    const mgr = new SnapshotManager({ store, resolver: res, pipeline, registry: center.registry, persistence: mem });

    // Distinct createdAt so ordering is deterministic.
    const mk = async (name: string, createdAt: string): Promise<SnapshotRecord> => {
      const snap = await mgr.capture({ name, scope: { type: "workspace", workspaceId: 11 }, actor: "owner" });
      await mem.remove([snap.id]);
      await mem.save({ ...snap, createdAt });
      return snap;
    };
    const older = await mk("gc-pin-older", new Date(Date.now() - 2 * 86400000).toISOString());
    const newest = await mk("gc-pin-newest", new Date(Date.now() - 1000).toISOString());
    await mgr.pin(older.id); // pin the OLDER one — retention would collect it, pin protects it
    await gc.run();
    expect(await mem.findById(older.id)).not.toBeNull();
    expect(await mem.findById(newest.id)).not.toBeNull();
  });
});

// ── 5. Restore verification ───────────────────────────────────────────────
describe("Restore verification — gates every restore", () => {
  it("accepts a valid snapshot (exists + checksum + configVersion + payload + registry)", async () => {
    const snap = await manager.capture({ name: "verify-ok", scope: { type: "workspace", workspaceId: 20 }, actor: "owner" });
    const result = await manager.verify(snap.id);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects when checksum is tampered (integrity)", async () => {
    const snap = await manager.capture({ name: "verify-tamper", scope: { type: "workspace", workspaceId: 21 }, actor: "owner" });
    const tampered = { ...snap, checksum: "0000000000000000" };
    const verifier = new SnapshotVerifier({ registry: center.registry });
    const result = verifier.verify(tampered);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/checksum mismatch/);
  });

  it("rejects unknown snapshot (exists gate)", async () => {
    const result = await manager.verify("does-not-exist");
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/not found/);
  });

  it("rejects when configVersion is incompatible", async () => {
    const snap = await manager.capture({ name: "verify-version", scope: { type: "workspace", workspaceId: 22 }, actor: "owner" });
    const stale = { ...snap, configVersion: 0 };
    const verifier = new SnapshotVerifier({ registry: center.registry });
    const result = verifier.verify(stale);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/configVersion/);
  });
});

// ── 6. Restore workflow stays inside the Governance Pipeline ──────────────
describe("Restore workflow — new revision, linear history, no Store bypass", () => {
  it("restore produces a new revision through the pipeline (not reactivating old)", async () => {
    // Commit a value, snapshot it, then change it — restore brings it back.
    const scope = { type: "workspace", workspaceId: 30 } as const;
    await center.pipeline.run({ actor: { actorId: "1", role: "owner" }, scope, changes: { "providers.temperature": 0.3 } });
    const snap = await manager.capture({ name: "restore-linear", scope, actor: "owner", origin: "rollback" });
    await center.pipeline.run({ actor: { actorId: "1", role: "owner" }, scope, changes: { "providers.temperature": 0.9 } });

    const before = center.store.revisionCount;
    const result = await manager.restore({ id: snap.id, actor: { actorId: "1", role: "owner" } });
    expect(result.revision).toBe(before + 1);
    const resolved = await center.resolver.resolve("providers.temperature", { workspaceId: 30 });
    expect(resolved.value).toBe(0.3); // snapshot value restored as a NEW revision
  });

  it("restore marks the source snapshot as RESTORED", async () => {
    const scope = { type: "workspace", workspaceId: 31 } as const;
    const snap = await manager.capture({ name: "restore-marked", scope, actor: "owner" });
    await manager.restore({ id: snap.id, actor: { actorId: "1", role: "owner" } });
    const stored = await persistence.findById(snap.id);
    expect(stored!.status).toBe("RESTORED");
  });

  it("restore is denied when verification fails (corrupted payload never reaches pipeline)", async () => {
    const scope = { type: "workspace", workspaceId: 32 } as const;
    const snap = await manager.capture({ name: "restore-verify-gate", scope, actor: "owner" });
    // Tamper the checksum in the backing store to simulate corruption (save is
    // immutable, so remove-then-write a corrupted copy).
    const bad = await persistence.findById(snap.id);
    await persistence.remove([snap.id]);
    await persistence.save({ ...bad!, checksum: "0000000000000000" });
    const before = center.store.revisionCount;
    await expect(manager.restore({ id: snap.id, actor: { actorId: "1", role: "owner" } })).rejects.toThrow(/checksum mismatch/);
    expect(center.store.revisionCount).toBe(before);
  });

  it("restore is denied by policy for non-privileged roles", async () => {
    const scope = { type: "workspace", workspaceId: 33 } as const;
    const snap = await manager.capture({ name: "restore-policy", scope, actor: "owner" });
    const before = center.store.revisionCount;
    await expect(manager.restore({ id: snap.id, actor: { actorId: "9", role: "viewer" } })).rejects.toThrow(/cannot write scope|denied by policy/);
    expect(center.store.revisionCount).toBe(before);
  });
});

// ── 7. Manager-level retention + GC wiring ────────────────────────────────
describe("SnapshotManager retention + GC wiring", () => {
  it("exposes retention policy and candidates through the manager", async () => {
    manager.setRetentionPolicy({ keepLatest: 5, keepYoungerThanDays: 0 });
    expect(manager.getRetentionPolicy().keepLatest).toBe(5);
    expect(Array.isArray(manager.retentionCandidates())).toBe(true);
  });

  it("runGc produces an audit event and syncs the mirror", async () => {
    const mem = new MemorySnapshotPersistence();
    const mgr = new SnapshotManager({
      store: center.store, resolver: center.resolver, pipeline: center.pipeline,
      registry: center.registry, persistence: mem,
    });
    for (let i = 0; i < 3; i++) {
      await mgr.capture({ name: `mgr-gc-${i}`, scope: { type: "workspace", workspaceId: 40 }, actor: "owner" });
    }
    mgr.setRetentionPolicy({ keepLatest: 1, keepYoungerThanDays: 0 });
    const event = await mgr.runGc();
    expect(event.collected).toBe(2);
    expect(mgr.count()).toBe(1);
    expect(mgr.gcAuditEvents.length).toBe(1);
  });
});
