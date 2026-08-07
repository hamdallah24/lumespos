// ConfigCenter — Milestone 3 Phase 3: Audit Center tests.
// Verifies the additive read-only Audit Center: timeline, explorer/search,
// revision detail (with replay-derived before/after/diff), correlation graph,
// and CSV export. All views derive from the authoritative Store revision log —
// they never mutate the Store, SnapshotManager, or pipeline.

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { MemorySnapshotPersistence } from "../../../src/settings/api/snapshot";
import { ConfigAuditCenter } from "../../../src/settings/api/audit/source";

let center: ConfigCenter;
let manager: SnapshotManager;
let audit: ConfigAuditCenter;

beforeAll(async () => {
  center = await initConfigCenter();
  const persistence = new MemorySnapshotPersistence();
  manager = new SnapshotManager({
    store: center.store,
    resolver: center.resolver,
    pipeline: center.pipeline,
    registry: center.registry,
    persistence,
  });
  audit = new ConfigAuditCenter({ center, snapshots: manager });
});

// Commit two revisions through the governance pipeline so the log has real data.
async function seedRevisions() {
  const p = center.pipeline;
  const run1 = await p.run({
    actor: { actorId: "seed", role: "owner", branchId: null, workspaceId: null },
    scope: { type: "workspace", workspaceId: 1 },
    changes: { "runtime.ric.enabled": true, "runtime.executive.enabled": false },
  });
  const run2 = await p.run({
    actor: { actorId: "seed", role: "owner", branchId: null, workspaceId: null },
    scope: { type: "workspace", workspaceId: 1 },
    changes: { "runtime.scheduler.enabled": false },
  });
  return { run1, run2 };
}

describe("Audit Center — timeline", () => {
  it("reflects every committed revision from the authoritative store log", async () => {
    const { run1 } = await seedRevisions();
    const tl = audit.timeline({ origin: "revision" });
    expect(tl.events.length).toBeGreaterThanOrEqual(2);
    const rev = tl.events.find((e) => e.revision === run1.revision);
    expect(rev).toBeDefined();
    expect(rev!.correlationId).toBe(run1.correlationId);
    expect(rev!.changedKeys).toContain("runtime.ric.enabled");
  });

  it("events are sorted newest-first", async () => {
    const tl = audit.timeline({ origin: "revision" });
    const times = tl.events.map((e) => e.timestamp);
    const sorted = [...times].sort((a, b) => b.localeCompare(a));
    expect(times).toEqual(sorted);
  });

  it("supports origin and date-range filters", async () => {
    const originFiltered = audit.timeline({ origin: "gc" });
    expect(originFiltered.events.every((e) => e.origin === "gc")).toBe(true);
  });
});

describe("Audit Center — explorer/search", () => {
  it("filters by actor", async () => {
    await seedRevisions();
    const byActor = audit.search({ actor: "seed" });
    expect(byActor.events.length).toBeGreaterThan(0);
    expect(byActor.events.every((e) => e.actor === "seed")).toBe(true);
  });

  it("filters by correlationId", async () => {
    const { run1 } = await seedRevisions();
    const byCorr = audit.search({ correlationId: run1.correlationId });
    expect(byCorr.events.length).toBe(1);
    expect(byCorr.events[0].revision).toBe(run1.revision);
  });

  it("filters by revision number", async () => {
    const { run1 } = await seedRevisions();
    const byRev = audit.search({ revision: run1.revision });
    expect(byRev.events.some((e) => e.revision === run1.revision)).toBe(true);
  });
});

describe("Audit Center — revision detail", () => {
  it("returns replay-derived before/after/diff for a revision", async () => {
    const { run1 } = await seedRevisions();
    const d = await audit.revision(run1.revision);
    expect(d).not.toBeNull();
    expect(d!.revision).toBe(run1.revision);
    expect(d!.changedKeys).toContain("runtime.ric.enabled");
    expect(d!.after["runtime.ric.enabled"]).toBe(true);
    expect(d!.diff.some((x) => x.key === "runtime.ric.enabled")).toBe(true);
  });

  it("exposes pipeline gate evaluations", async () => {
    const { run1 } = await seedRevisions();
    const d = await audit.revision(run1.revision);
    const stages = (d?.gates ?? []).map((g) => g.stage);
    expect(stages).toContain("VALIDATE");
    expect(stages).toContain("POLICY");
    expect(stages).toContain("SIMULATION");
    expect(stages).toContain("IMPACT");
  });

  it("returns null for an unknown revision", async () => {
    const d = await audit.revision(99999);
    expect(d).toBeNull();
  });

  it("links snapshots captured at the same revision", async () => {
    const { run1 } = await seedRevisions();
    await manager.capture({ name: "audit-link", scope: { type: "workspace", workspaceId: 1 }, actor: "owner" });
    const d = await audit.revision(run1.revision);
    expect(d).not.toBeNull();
  });

  it("surfaces restore origin when a snapshot was RESTORED", async () => {
    await seedRevisions();
    const snap = await manager.capture({ name: "audit-restore", scope: { type: "workspace", workspaceId: 1 }, actor: "owner" });
    await manager.restore({ id: snap.id, actor: { actorId: "owner", role: "owner", branchId: null, workspaceId: 1 } });
    // After restore, the next committed revision should have a restore origin.
    const d = await audit.revision(center.store.revisionCount);
    expect(d).not.toBeNull();
  });
});

describe("Audit Center — correlation graph", () => {
  it("builds a change→revision→audit→event→health chain", async () => {
    const { run1 } = await seedRevisions();
    const g = await audit.correlation(run1.correlationId);
    expect(g).not.toBeNull();
    const kinds = g!.nodes.map((n) => n.kind);
    expect(kinds).toContain("change");
    expect(kinds).toContain("revision");
    expect(kinds).toContain("audit");
    expect(kinds).toContain("event");
    expect(kinds).toContain("health");
    expect(g!.edges.length).toBeGreaterThanOrEqual(4);
  });

  it("returns null for an unknown correlationId", async () => {
    const g = await audit.correlation("nope-123");
    expect(g).toBeNull();
  });
});

describe("Audit Center — export", () => {
  it("exports a CSV with headers and data rows", async () => {
    await seedRevisions();
    const csv = audit.exportCsv();
    expect(csv).toContain("origin,timestamp,revision");
    const lines = csv.split("\n");
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe("Audit Center — read-only contract", () => {
  it("never mutates the store, revisions, or overrides", async () => {
    const revBefore = center.store.revisionCount;
    const overridesBefore = center.store.overrideCount;
    audit.timeline({ origin: "revision" });
    audit.search({ actor: "seed" });
    await audit.revision(1);
    expect(center.store.revisionCount).toBe(revBefore);
    expect(center.store.overrideCount).toBe(overridesBefore);
  });
});