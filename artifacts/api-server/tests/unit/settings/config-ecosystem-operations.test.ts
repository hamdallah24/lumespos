// ConfigCenter — Milestone 6 Phase 4: Ecosystem Operations acceptance tests.
// Covers: Ecosystem Health (healthy/degraded/critical), Package Diagnostics
// (invalid/checksum/missing/conflict/cycle/incompatible/blocked), Capability
// Explorer (discovery/filtering/association/unavailable), Operational Journal
// (append/immutable/chronological/correlation/force-removal event), Lifecycle
// Operations (install/remove/blocked/forced audit) and the architecture boundary
// (no store mutation, no pipeline, no config registry change).

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { PackageManager } from "../../../src/settings/marketplace";
import type { PackageManifest } from "../../../src/settings/marketplace";
import { manifestChecksum } from "../../../src/settings/marketplace";
import { validatePackageManifest } from "../../../src/settings/marketplace";
import { EcosystemHealth } from "../../../src/settings/ecosystem/health";
import { EcosystemDiagnostics } from "../../../src/settings/ecosystem/diagnostics";
import { EcosystemExplorer, PackageCapabilitySource } from "../../../src/settings/ecosystem/explorer";
import { EcosystemJournal } from "../../../src/settings/ecosystem/journal";
import { EcosystemOperations } from "../../../src/settings/ecosystem/operations";

const basePkg = (over: Partial<PackageManifest>): PackageManifest => {
  const manifest: PackageManifest = {
    name: "com.lumes.pkg",
    version: "1.0.0",
    type: "plugin",
    manifestVersion: "1.0.0",
    description: "test",
    provides: ["pkg.cap"],
    ...over,
  };
  return manifest;
};

let pm: PackageManager;
beforeEach(() => {
  pm = new PackageManager({ now: () => 1000 });
});

describe("Ecosystem Health", () => {
  it("reports HEALTHY for a green ecosystem", () => {
    pm.discover(basePkg({}));
    pm.install("com.lumes.pkg");
    const health = new EcosystemHealth({ registry: pm.registry });
    const r = health.report();
    expect(r.status).toBe("HEALTHY");
    expect(r.packageRegistry.active).toBe(1);
  });

  it("reports CRITICAL when a manifest is invalid", () => {
    // register an invalid manifest directly (discover() would reject it)
    pm.registry.register(basePkg({ name: "", version: "x" }) as never);
    const health = new EcosystemHealth({ registry: pm.registry });
    const r = health.report();
    expect(r.status).toBe("CRITICAL");
    expect(r.packageRegistry.invalid).toBe(1);
  });

  it("reports CRITICAL on a missing dependency", () => {
    pm.discover(basePkg({ name: "a", dependencies: [{ name: "ghost", range: "^1.0.0" }] }));
    const health = new EcosystemHealth({ registry: pm.registry });
    expect(health.report().status).toBe("CRITICAL");
  });

  it("reports DEGRADED on an incompatible version", () => {
    pm.discover(basePkg({ name: "a", version: "1.0.0" }));
    pm.discover(basePkg({ name: "b", version: "1.0.0", dependencies: [{ name: "a", range: "^2.0.0" }] }));
    const health = new EcosystemHealth({ registry: pm.registry });
    expect(health.report().status).toBe("DEGRADED");
  });
});

describe("Ecosystem Diagnostics", () => {
  it("returns no error diagnostics for a valid package", () => {
    pm.discover(basePkg({}));
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.errorCount).toBe(0);
  });

  it("flags an invalid manifest", () => {
    pm.registry.register(basePkg({ version: "not-semver" }));
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "invalid-manifest")).toBe(true);
  });

  it("flags a checksum mismatch", () => {
    const m = basePkg({});
    const sanitized = validatePackageManifest(m).manifest!;
    pm.registry.register({ ...sanitized, checksum: "deadbeef", checksumAlgorithm: "fnv1a" });
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "checksum-mismatch")).toBe(true);
  });

  it("flags a missing dependency", () => {
    pm.discover(basePkg({ name: "a", dependencies: [{ name: "ghost", range: "^1.0.0" }] }));
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "missing-dependency")).toBe(true);
  });

  it("flags a dependency cycle", () => {
    pm.discover(basePkg({ name: "a", dependencies: [{ name: "b", range: "^1.0.0" }] }));
    pm.discover(basePkg({ name: "b", dependencies: [{ name: "a", range: "^1.0.0" }] }));
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "dependency-cycle")).toBe(true);
  });

  it("flags an incompatible version", () => {
    pm.discover(basePkg({ name: "a", version: "1.0.0" }));
    pm.discover(basePkg({ name: "b", dependencies: [{ name: "a", range: "^2.0.0" }] }));
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "incompatible-version")).toBe(true);
  });

  it("flags blocked removal when a dependent is active", () => {
    pm.discover(basePkg({ name: "a" }));
    pm.discover(basePkg({ name: "b", dependencies: [{ name: "a", range: "^1.0.0" }] }));
    pm.install("b");
    const d = new EcosystemDiagnostics({ registry: pm.registry }).run();
    expect(d.diagnostics.some((x) => x.kind === "blocked-removal")).toBe(true);
  });
});

describe("Capability Explorer", () => {
  let explorer: EcosystemExplorer;

  beforeEach(() => {
    pm.discover(basePkg({ name: "pkgA", provides: ["alpha", "beta"] }));
    pm.discover(basePkg({ name: "pkgB", provides: ["beta", "gamma"] }));
    explorer = new EcosystemExplorer({
      sources: [new PackageCapabilitySource(pm.registry)],
      hostCapabilities: ["host.cap"],
    });
  });

  it("discovers all capabilities from packages + host", () => {
    const caps = explorer.list();
    expect(caps.map((c) => c.capability)).toEqual(expect.arrayContaining(["alpha", "beta", "gamma", "host.cap"]));
  });

  it("filters by required capabilities", () => {
    const caps = explorer.list(["gamma"]);
    expect(caps.map((c) => c.capability)).toEqual(["gamma"]);
  });

  it("associates capabilities to their package provider", () => {
    const ofPkg = explorer.ofProvider("pkgA").map((c) => c.capability);
    expect(ofPkg).toEqual(["alpha", "beta"]);
  });

  it("reports unavailable when a required capability has no provider (not registered)", () => {
    // no package provides "missing" → providersOf returns host only if host has it
    const providers = explorer.providersOf(["missing"]);
    expect(providers).toEqual([]);
  });
});

describe("Ecosystem Operational Journal", () => {
  let journal: EcosystemJournal;
  beforeEach(() => { journal = new EcosystemJournal({ now: () => 2000 }); });

  it("appends monotonic chronological records", () => {
    const a = journal.append({ type: "package.discovered", package: "p", version: "1.0.0", correlationId: "c1" });
    const b = journal.append({ type: "package.activated", package: "p", version: "1.0.0", correlationId: "c1" });
    expect(a.seq).toBe(1);
    expect(b.seq).toBe(2);
    expect(b.timestamp).toBeGreaterThanOrEqual(a.timestamp);
  });

  it("is immutable (frozen records + copies)", () => {
    const rec = journal.append({ type: "package.discovered", package: "p" });
    expect(Object.isFrozen(rec)).toBe(true);
    const copy = journal.list()[0];
    expect(() => { (copy as any).detail = "hacked"; }).toThrow();
  });

  it("groups by correlation id", () => {
    journal.append({ type: "package.install.started", package: "p", correlationId: "op-1" });
    journal.append({ type: "package.install.completed", package: "p", correlationId: "op-1" });
    journal.append({ type: "package.discovered", package: "q", correlationId: "op-2" });
    expect(journal.byCorrelation("op-1").length).toBe(2);
  });

  it("rejects unknown event types", () => {
    expect(() => journal.append({ type: "bogus" as any, package: "p" })).toThrow(/unknown event type/);
  });
});

describe("Ecosystem Operations (lifecycle + force-removal audit)", () => {
  let ops: EcosystemOperations;
  beforeEach(() => {
    ops = new EcosystemOperations({ packageManager: pm, now: () => 3000 });
  });

  it("installs through PackageManager and journals the trail", () => {
    pm.discover(basePkg({ name: "app" }));
    const r = ops.install("app", "1.0.0", { actor: "op", correlationId: "corr-1" });
    expect(r.ok).toBe(true);
    const events = ops.events();
    const types = events.map((e) => e.type);
    expect(types).toContain("package.install.started");
    expect(types).toContain("package.install.completed");
    expect(types).toContain("package.activated");
    expect(ops.status("app")[0].currentState).toBe("active");
  });

  it("records package.remove.blocked when a removal is refused", () => {
    pm.discover(basePkg({ name: "a" }));
    pm.discover(basePkg({ name: "b", dependencies: [{ name: "a", range: "^1.0.0" }] }));
    pm.install("b");
    const r = ops.remove("a");
    expect(r.ok).toBe(false);
    expect(ops.events().some((e) => e.type === "package.remove.blocked")).toBe(true);
  });

  it("force-removal is explicit, reason-aware and journaled (never silent)", () => {
    pm.discover(basePkg({ name: "a" }));
    pm.discover(basePkg({ name: "b", dependencies: [{ name: "a", range: "^1.0.0" }] }));
    pm.install("b");
    const r = ops.forceRemove("a", "1.0.0", { actor: "op", reason: "deprecated required", correlationId: "force-1" });
    expect(r.ok).toBe(true);
    const trail = ops.events().filter((e) => e.correlationId === "force-1").map((e) => e.type);
    expect(trail).toContain("package.remove.forced");
    expect(trail).toContain("package.remove.completed");
    const forced = ops.events().find((e) => e.type === "package.remove.forced") as any;
    expect(forced).toBeTruthy();
    expect(forced.actor).toBe("op");
  });

  it("refuses an empty-reason force-removal and records it as blocked", () => {
    pm.discover(basePkg({ name: "a" }));
    const r = ops.forceRemove("a", "1.0.0", { reason: "" });
    expect(r.ok).toBe(false);
    expect(ops.events().some((e) => e.type === "package.remove.blocked")).toBe(true);
  });
});

// ── Architecture boundary ─────────────────────────────────────────────────
describe("Ecosystem Operations architecture boundary", () => {
  let center: ConfigCenter;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
  });

  it("reads registry status without mutating ConfigCenter store", async () => {
    const before = center.store.revisionCount;
    const pm2 = new PackageManager();
    const ops = new EcosystemOperations({ packageManager: pm2 });
    pm2.discover(basePkg({ name: "x" }));
    ops.install("x");
    ops.forceRemove("x", undefined, { reason: "cleanup" });
    // diagnostics/health near the marketplace never touch config commits
    expect(center.store.revisionCount).toBe(before);
  });
});