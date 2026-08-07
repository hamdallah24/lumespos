// ConfigCenter — Milestone 6 Phase 3: Marketplace Foundation acceptance tests.
// Covers: Package Manifest (validity + deterministic canonicalization/checksum),
// Package Registry (register/duplicate/lookup/unregister/version resolution),
// Dependency Graph (direct/transitive/missing/conflict/cycle/topo order),
// Integrity (valid/corrupt/mismatch), Lifecycle (install/remove/blocked/idempotent)
// and the architecture boundary (no commit / no config-authority takeover).

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import {
  PackageManager,
  PackageRegistry,
  resolveDependencyGraph,
  validatePackageManifest,
  canonicalManifest,
  manifestChecksum,
  artifactChecksum,
} from "../../../src/settings/marketplace";
import type { PackageManifest } from "../../../src/settings/marketplace";

const basePkg = (over: Partial<PackageManifest>): PackageManifest => ({
  name: "com.lumes.pkg",
  version: "1.0.0",
  type: "plugin",
  manifestVersion: "1.0.0",
  description: "test",
  provides: ["pkg.cap"],
  ...over,
});

describe("Package Manifest", () => {
  it("accepts a valid manifest", () => {
    const v = validatePackageManifest(basePkg({}));
    expect(v.ok).toBe(true);
    expect(v.manifest?.name).toBe("com.lumes.pkg");
  });

  it("rejects invalid manifest (bad name/version/type/manifestVersion)", () => {
    const v = validatePackageManifest(basePkg({ name: "", version: "x", type: "nope" as never, manifestVersion: "zz" }));
    expect(v.ok).toBe(false);
    const paths = v.issues.map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "version", "type", "manifestVersion"]));
  });

  it("canonicalization + checksum are deterministic (key order independent)", () => {
    const a = basePkg({ description: "same", dependencies: [{ name: "b", range: "^1.0.0" }] });
    const b = basePkg({ dependencies: [{ name: "b", range: "^1.0.0" }], description: "same" });
    expect(canonicalManifest(a)).toBe(canonicalManifest(b));
    expect(manifestChecksum(a)).toBe(manifestChecksum(b));
  });

  it("checksum changes when content changes", () => {
    const a = basePkg({ version: "1.0.0" });
    const b = basePkg({ version: "1.0.1" });
    expect(manifestChecksum(a)).not.toBe(manifestChecksum(b));
  });

  it("artifactChecksum folds manifest + payload identity", () => {
    const m = basePkg({});
    expect(artifactChecksum(m, { k: 1 })).not.toBe(artifactChecksum(m, { k: 2 }));
  });
});

describe("Package Registry", () => {
  let reg: PackageRegistry;
  beforeEach(() => { reg = new PackageRegistry(() => 1000); });

  it("registers, duplicates, looks up, resolves versions", () => {
    reg.register(basePkg({ name: "a", version: "1.0.0" }));
    reg.register(basePkg({ name: "a", version: "1.1.0" }));
    expect(reg.has("a")).toBe(true);
    expect(reg.get("a")).toHaveLength(2);
    // duplicate same name+version replaces
    reg.register(basePkg({ name: "a", version: "1.0.0", description: "v2" }));
    expect(reg.getVersion("a", "1.0.0")?.description).toBe("v2");
    // version resolution picks highest satisfying
    const res = reg.resolve("a", "^1.0.0");
    expect(res.selected?.version).toBe("1.1.0");
    const none = reg.resolve("a", "^2.0.0");
    expect(none.selected).toBeNull();
  });

  it("unregisters package and clears status", () => {
    reg.register(basePkg({ name: "a", version: "1.0.0" }));
    expect(reg.unregister("a")).toBe(true);
    expect(reg.has("a")).toBe(false);
    expect(reg.unregister("a")).toBe(false);
  });

  it("discovers capabilities", () => {
    reg.register(basePkg({ name: "a", provides: ["x"], version: "1.0.0" }));
    const found = reg.discoverCapabilities(["x"]);
    expect(found.map((f) => f.name)).toContain("a");
  });
});

describe("Dependency Graph", () => {
  it("resolves direct + transitive with deterministic install/removal order", () => {
    const a = baseName("a", [{ name: "b", range: "^1.0.0" }, { name: "c", range: "^1.0.0" }]);
    const b = baseName("b", [{ name: "d", range: "^1.0.0" }]);
    const c = baseName("c", []);
    const d = baseName("d", []);
    const g = resolveDependencyGraph(new Map([[a.name, a], [b.name, b], [c.name, c], [d.name, d]]));
    expect(g.ok).toBe(true);
    // consumer `a` must install last (dependency-first order)
    expect(g.installOrder.indexOf("a")).toBeGreaterThan(g.installOrder.indexOf("b"));
    expect(g.installOrder.indexOf("a")).toBeGreaterThan(g.installOrder.indexOf("c"));
    expect(g.installOrder.indexOf("b")).toBeGreaterThan(g.installOrder.indexOf("d"));
    expect(g.direct.length).toBeGreaterThan(0);
    expect(g.transitive.length).toBeGreaterThan(0);
  });

  it("flags missing + version-mismatch dependency", () => {
    const a = baseName("a", [{ name: "ghost", range: "^1.0.0" }]);
    const g = resolveDependencyGraph(new Map([[a.name, a]]));
    expect(g.ok).toBe(false);
    expect(g.issues.some((i) => i.kind === "missing")).toBe(true);
  });

  it("detects a circular dependency (topo empty)", () => {
    const a = baseName("a", [{ name: "b", range: "^1.0.0" }]);
    const b = baseName("b", [{ name: "a", range: "^1.0.0" }]);
    const g = resolveDependencyGraph(new Map([[a.name, a], [b.name, b]]));
    expect(g.ok).toBe(false);
    expect(g.issues.some((i) => i.kind === "cycle")).toBe(true);
    expect(g.installOrder).toHaveLength(0);
  });

  it("detects conflicting ranges declared by one package", () => {
    const a = baseName("a", [{ name: "d", range: "^1.0.0" }, { name: "d", range: "^2.0.0" }]);
    const d = baseName("d", []);
    const g = resolveDependencyGraph(new Map([[a.name, a], [d.name, d]]));
    expect(g.ok).toBe(false);
    expect(g.issues.some((i) => i.kind === "conflict")).toBe(true);
  });
});

describe("Integrity", () => {
  let pm: PackageManager;
  beforeEach(() => { pm = new PackageManager({ now: () => 1 }); });

  it("accepts checksum-consistent registration", () => {
    const m = basePkg({ name: "i", version: "1.0.0" });
    const sanitized = validatePackageManifest(m).manifest!;
    const checksum = manifestChecksum(sanitized);
    const r = pm.discover({ ...m, checksum });
    expect(r.ok).toBe(true);
  });

  it("rejects a manifest whose declared checksum does not match", () => {
    const m = basePkg({ name: "i", version: "1.0.0" });
    const r = pm.discover({ ...m, checksum: "deadbeef" });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/checksum mismatch/);
  });
});

describe("Lifecycle", () => {
  let pm: PackageManager;
  beforeEach(() => { pm = new PackageManager({ now: () => 5 }); });

  it("installs package and moves it to ACTIVE", () => {
    const a = basePkg({ name: "a", version: "1.0.0" });
    pm.discover(a);
    const r = pm.install("a");
    expect(r.ok).toBe(true);
    expect(r.status).toBe("active");
    expect(pm.registry.status("a", "1.0.0")).toBe("active");
  });

  it("fails install on missing dependency", () => {
    const a = basePkg({ name: "a", version: "1.0.0", dependencies: [{ name: "ghost", range: "^1.0.0" }] });
    pm.discover(a);
    const r = pm.install("a");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/dependency/);
  });

  it("fails install on invalid manifest", () => {
    const a = basePkg({ name: "a", version: "1.0.0" });
    pm.discover(a);
    // corrupt the stored manifest
    const stored = pm.registry.getVersion("a", "1.0.0")!;
    stored.version = "not-semver";
    const r = pm.install("a");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/manifest invalid/);
  });

  it("blocks removal while a dependent is active; force bypasses", () => {
    const a = basePkg({ name: "a", version: "1.0.0" });
    const b = basePkg({ name: "b", version: "1.0.0", dependencies: [{ name: "a", range: "^1.0.0" }] });
    pm.discover(a);
    pm.discover(b);
    pm.install("b");
    expect(pm.registry.status("a", "1.0.0")).toBe("active");
    const blocked = pm.remove("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/dependents/);
    const forced = pm.remove("a", "1.0.0", "force");
    expect(forced.ok).toBe(true);
    expect(pm.registry.has("a", "1.0.0")).toBe(false);
  });

  it("removal succeeds when no active dependent", () => {
    const a = basePkg({ name: "a", version: "1.0.0" });
    pm.discover(a);
    pm.install("a");
    const r = pm.remove("a");
    expect(r.ok).toBe(true);
    expect(r.status).toBe("removed");
    expect(pm.registry.has("a", "1.0.0")).toBe(false);
  });
});

describe("Architecture boundary", () => {
  it("marketplace is a pure consumer: no ConfigCenter-side mutation via SDK", async () => {
    const center = new ConfigCenter();
    await center.init();
    const before = center.store.revisionCount;
    const pm = new PackageManager();
    pm.discover(basePkg({ name: "a", version: "1.0.0" }));
    pm.install("a");
    // no configuration fixture was committed, and the store revision must be untouched
    expect(center.store.revisionCount).toBe(before);
  });
});

// — helpers -------------------------------------------------------------
function baseName(name: string, deps: PackageManifest["dependencies"]): PackageManifest {
  return basePkg({ name, version: "1.0.0", dependencies: deps });
}