// ConfigCenter — REST user layer unit tests (Milestone 2).
// Verifies the thin-controller + services contract WITHOUT touching the locked
// core: plan() never commits, restore/install go through the pipeline, and the
// catalog response is derived from the Registry (metadata-driven, no hardcode).

import { describe, it, expect, beforeAll } from "vitest";
import type { ConfigCenter } from "../../../src/settings";
import { initConfigCenter } from "../../../src/settings";
import { SettingsController } from "../../../src/settings/api/controller";
import { SnapshotManager } from "../../../src/settings/api/snapshots";
import { PackageStore } from "../../../src/settings/api/packages";

let center: ConfigCenter;
let controller: SettingsController;
let snapshots: SnapshotManager;
let packages: PackageStore;

const owner = { id: 1, role: "owner" };
const manager = { id: 2, role: "manager" };

beforeAll(async () => {
  center = await initConfigCenter();
  snapshots = new SnapshotManager({ store: center.store, resolver: center.resolver, pipeline: center.pipeline });
  packages = new PackageStore(center.registry, center.pipeline);
  controller = new SettingsController({ center, snapshots, packages });
});

describe("SettingsController — catalog is metadata-driven", () => {
  it("list groups come from the Registry (no hardcoded fields)", async () => {
    const data = (await controller.list({})) as { version: number; groups: Array<{ id: string; fields: unknown[] }> };
    expect(data.groups.length).toBeGreaterThan(0);
    const fieldCount = data.groups.reduce((acc, g) => acc + g.fields.length, 0);
    expect(fieldCount).toBe(center.registry.list().length);
  });

  it("getField returns field + resolved + trace for a declared key", async () => {
    const data = (await controller.getField("providers.temperature", {})) as { field: { key: string }; resolved: { inherited: boolean }; trace: unknown[] };
    expect(data.field.key).toBe("providers.temperature");
    expect(data.resolved.inherited).toBe(false);
    expect(data.trace.length).toBeGreaterThan(0);
  });
});

describe("SettingsController — plan endpoints never commit", () => {
  it("preview computes before/after without producing a revision", async () => {
    const before = center.store.revisionCount;
    const p = { scope: { type: "workspace", workspaceId: 1 }, changes: { "providers.temperature": 0.9 } };
    const data = (await controller.preview(p, owner)) as { before: Record<string, unknown>; after: Record<string, unknown> };
    expect(data.after["providers.temperature"]).toBe(0.9);
    expect(center.store.revisionCount).toBe(before);
  });

  it("simulate returns metadata-driven estimates", async () => {
    const p = { scope: { type: "branch", branchId: 5 }, changes: { "providers.temperature": 0.5 } };
    const data = (await controller.simulate(p, owner)) as { items: Array<{ key: string; confidence: string }> };
    expect(data.items.length).toBe(1);
    expect(data.items[0].key).toBe("providers.temperature");
  });

  it("impact returns affected subsystems from Registry edges", async () => {
    const p = { scope: { type: "workspace", workspaceId: 1 }, changes: { "providers.temperature": 0.5 } };
    const data = (await controller.impact(p, owner)) as { impacted: string[] };
    expect(data.impacted.length).toBeGreaterThan(0);
  });

  it("policy-check reflects RBAC", async () => {
    const p = { scope: { type: "workspace", workspaceId: 1 }, changes: { "providers.temperature": 0.5 } };
    const ownerCheck = (await controller.checkPolicy(p, owner)) as { ok: boolean };
    expect(ownerCheck.ok).toBe(true);
    const viewerCheck = (await controller.checkPolicy(p, { id: 3, role: "viewer" })) as { ok: boolean };
    expect(viewerCheck.ok).toBe(false);
  });
});

describe("SettingsController — update commits via pipeline only", () => {
  it("PUT produces a revision and changes resolution", async () => {
    const before = center.store.revisionCount;
    const data = (await controller.update("providers.temperature", { scope: { type: "workspace", workspaceId: 1 }, value: 0.8 }, manager)) as { ok: boolean; revision: number };
    expect(data.ok).toBe(true);
    expect(data.revision).toBe(before + 1);
    const resolved = await center.resolver.resolve("providers.temperature", { workspaceId: 1 });
    expect(resolved.value).toBe(0.8);
  });

  it("rejects validation errors without committing", async () => {
    const before = center.store.revisionCount;
    await expect(controller.update("providers.temperature", { scope: { type: "workspace", workspaceId: 1 }, value: "not-a-number" }, owner)).rejects.toThrow();
    expect(center.store.revisionCount).toBe(before);
  });
});

describe("SnapshotManager — captures and restores via pipeline", () => {
  it("capture snapshot of committed overrides for a scope", async () => {
    const snap = await snapshots.capture({ name: "before-change", scope: { type: "workspace", workspaceId: 1 }, actor: "owner" });
    expect(snap.changes["providers.temperature"]).toBe(0.8);
    expect(snapshots.search("before-change").length).toBe(1);
  });

  it("restore goes through the pipeline and produces a revision", async () => {
    const snap = await snapshots.capture({ name: "restore-target", scope: { type: "workspace", workspaceId: 1 }, actor: "owner" });
    const before = center.store.revisionCount;
    const result = await snapshots.restore({ id: snap.id, actor: { actorId: "1", role: "owner" } });
    expect(result.revision).toBe(before + 1);
  });
});

describe("PackageStore — install via pipeline", () => {
  it("rejects packages referencing unknown keys", () => {
    expect(() => packages.register({ id: "bad", name: "Bad", version: "1", changes: { "totally.unknown": 1 } }))
      .toThrow(/unknown keys/);
  });

  it("registers and applies a valid package", async () => {
    packages.register({
      id: "test.runtime",
      name: "Test Runtime",
      version: "1.0.0",
      changes: { "runtime.executive.enabled": true },
      scope: { type: "workspace", workspaceId: 1 },
    });
    const before = center.store.revisionCount;
    const result = await packages.install({ packageId: "test.runtime", actor: { actorId: "1", role: "owner" } });
    expect(result.applied).toContain("runtime.executive.enabled");
    expect(result.revision).toBe(before + 1);
  });
});