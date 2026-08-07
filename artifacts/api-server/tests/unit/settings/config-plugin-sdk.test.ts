// ConfigCenter — Milestone 6 Phase 1: Plugin SDK acceptance tests.
// Covers: Plugin Manifest validation, Version Compatibility (semver ranges),
// Capability Registration, Dependency Validation (missing/range/cycle/topo),
// Lifecycle state machine, and the manager integration incl. bus wiring.

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { ConfigEventBus } from "../../../src/settings/events";
import { PluginManager } from "../../../src/settings/plugins";
import { validatePluginManifest } from "../../../src/settings/plugins/manifest";
import { VersionCompatibility } from "../../../src/settings/plugins/compatibility";
import { validateDependencies } from "../../../src/settings/plugins/dependencies";
import { parseVersion, satisfiesVersion, compareVersions } from "../../../src/settings/plugins/semver";
import type { PluginManifest } from "../../../src/settings/plugins/types";

const baseManifest = (over: Partial<PluginManifest>): PluginManifest => ({
  id: "com.lumes.temperature",
  name: "Temperature plugin",
  version: "1.0.0",
  apiVersion: "1.0.0",
  hooks: ["on-start", "on-stop"],
  capabilities: ["temperature.sensor"],
  ...over,
});

describe("Plugin Manifest", () => {
  it("accepts a valid manifest", () => {
    const v = validatePluginManifest(baseManifest({}));
    expect(v.ok).toBe(true);
    expect(v.manifest?.id).toBe("com.lumes.temperature");
  });

  it("rejects missing id / bad version / unknown hook", () => {
    const v = validatePluginManifest(baseManifest({ id: "", version: "not-a-version", hooks: ["on-bogus" as never] }));
    expect(v.ok).toBe(false);
    const paths = v.issues.map((i) => i.path);
    expect(paths).toContain("id");
    expect(paths).toContain("version");
    expect(paths).toContain("hooks");
  });

  it("rejects invalid dependency range", () => {
    const v = validatePluginManifest(baseManifest({ dependencies: [{ id: "x", range: "banana" }] }));
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.path.includes("range"))).toBe(true);
  });
});

describe("Version Compatibility (semver)", () => {
  it("parses and orders versions", () => {
    const a = parseVersion("1.2.3")!;
    const b = parseVersion("1.10.0")!;
    const c = parseVersion("2.0.0")!;
    expect(compareVersions(a, b)).toBe(-1);
    expect(compareVersions(b, a)).toBe(1);
    expect(compareVersions(c, b)).toBe(1);
  });

  it("matches exact / caret / tilde / comparison ranges", () => {
    expect(satisfiesVersion("1.2.3", "1.2.3")).toBe(true);
    expect(satisfiesVersion("1.5.0", "^1.0.0")).toBe(true);
    expect(satisfiesVersion("2.0.0", "^1.0.0")).toBe(false);
    expect(satisfiesVersion("1.2.5", "~1.2.0")).toBe(true);
    expect(satisfiesVersion("1.3.0", "~1.2.0")).toBe(false);
    expect(satisfiesVersion("2.0.0", ">=1.0.0")).toBe(true);
    expect(satisfiesVersion("0.9.0", ">=1.0.0")).toBe(false);
  });

  it("rejects a plugin targeting a newer plugin-api major", () => {
    const compat = new VersionCompatibility("1.5.0", "1.0.0");
    const r = compat.check(baseManifest({ apiVersion: "2.0.0" }));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/plugin-api/);
  });

  it("rejects a plugin whose sdk range the host cannot satisfy", () => {
    const compat = new VersionCompatibility("1.5.0", "1.0.0");
    const r = compat.check(baseManifest({ requiresSdk: "^2.0.0" }));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/config-sdk/);
  });
});

describe("Dependency Validation", () => {
  it("passes when all deps present and compatible; order is topological", () => {
    const a = baseManifest({ id: "a", version: "1.0.0" });
    const b = baseManifest({ id: "b", version: "1.0.0", dependencies: [{ id: "a", range: "^1.0.0" }] });
    const avail = new Map<string, PluginManifest>([[a.id, a]]);
    const r = validateDependencies(b, avail);
    expect(r.ok).toBe(true);
    expect(r.order.indexOf("a")).toBeLessThan(r.order.indexOf("b"));
  });

  it("flags missing required dependency", () => {
    const b = baseManifest({ id: "b", dependencies: [{ id: "missing", range: "^1.0.0" }] });
    const r = validateDependencies(b, new Map());
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/not registered/);
  });

  it("flags version range mismatch", () => {
    const a = baseManifest({ id: "a", version: "2.0.0" });
    const b = baseManifest({ id: "b", dependencies: [{ id: "a", range: "^1.0.0" }] });
    const r = validateDependencies(b, new Map([[a.id, a]]));
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/does not satisfy/);
  });

  it("detects a circular dependency", () => {
    const a = baseManifest({ id: "a", dependencies: [{ id: "b", range: "^1.0.0" }] });
    const b = baseManifest({ id: "b", dependencies: [{ id: "a", range: "^1.0.0" }] });
    const avail = new Map<string, PluginManifest>([[a.id, a]]);
    const r = validateDependencies(b, avail);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.includes("cycle"))).toBe(true);
  });
});

describe("PluginManager — registration gates", () => {
  let center: ConfigCenter;
  let manager: PluginManager;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    manager = new PluginManager({ sdk: center.sdk, bus: center.bus, hostCapabilities: ["core.settings"] });
  });

  it("registers a compatible plugin", () => {
    const reg = manager.register(baseManifest({ capabilities: ["temp.sensor"] }), { start: () => {} });
    expect(reg.manifest.id).toBe("com.lumes.temperature");
    expect(manager.status("com.lumes.temperature")).toBe("registered");
  });

  it("rejects a manifest-invalid plugin", () => {
    expect(() => manager.register(baseManifest({ id: "" }), {})).toThrow(/manifest invalid/);
  });

  it("rejects an incompatible plugin and rolls back capability registration", () => {
    const m = baseManifest({ id: "bad.api", version: "1.0.0", apiVersion: "9.0.0", capabilities: ["leak.cap"] });
    expect(() => manager.register(m, {})).toThrow(/incompatible/);
    expect(manager.report().capabilities.some((c) => c.capability === "leak.cap")).toBe(false);
  });

  it("rejects duplicate registration", () => {
    manager.register(baseManifest({}), {});
    expect(() => manager.register(baseManifest({}), {})).toThrow(/already registered/);
  });
});

describe("PluginManager — lifecycle", () => {
  let center: ConfigCenter;
  let manager: PluginManager;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    manager = new PluginManager({ sdk: center.sdk });
  });

  it("drives init → start → stop and counts transitions", async () => {
    manager.register(baseManifest({}), { start: () => {}, stop: () => {} });
    const started = await manager.start("com.lumes.temperature");
    expect(started.status).toBe("active");
    await manager.start("com.lumes.temperature"); // idempotent
    await manager.stop("com.lumes.temperature");
    const stopped = manager.registration("com.lumes.temperature")!;
    expect(stopped.status).toBe("inactive");
    expect(stopped.stopCount).toBe(1);
  });

  it("moves to error state when a hook throws", async () => {
    manager.register(baseManifest({}), { start: () => { throw new Error("boom"); } });
    const r = await manager.start("com.lumes.temperature");
    expect(r.status).toBe("error");
  });

  it("unregister stops active plugin and removes it", async () => {
    manager.register(baseManifest({}), { start: () => {} });
    await manager.start("com.lumes.temperature");
    await manager.unregister("com.lumes.temperature");
    expect(manager.status("com.lumes.temperature")).toBeUndefined();
  });
});

describe("PluginManager — capabilities + event wiring", () => {
  it("seeds host capabilities and resolves providers", async () => {
    const center = new ConfigCenter();
    await center.init();
    const manager = new PluginManager({ sdk: center.sdk, hostCapabilities: ["trace"] });
    manager.register(baseManifest({ capabilities: ["temp.sensor"] }), {});
    const rep = manager.report();
    expect(rep.capabilities.map((c) => c.capability)).toContain("trace");
    expect(rep.capabilities.some((c) => c.capability === "temp.sensor" && c.provider === "com.lumes.temperature")).toBe(true);
  });

  it("forwards configuration-changed notifications to subscribed plugin hooks", async () => {
    const center = new ConfigCenter();
    await center.init();
    const bus = new ConfigEventBus();
    const manager = new PluginManager({ sdk: center.sdk, bus });
    const seen: number[] = [];
    manager.register(baseManifest({ hooks: ["on-config-changed"] }), {
      onConfigurationChanged: (e) => {
        seen.push(e.revision);
      },
    });
    const changed = {
      type: "configuration.changed" as const,
      revision: 7,
      scope: { type: "workspace" as const, workspaceId: 1 },
      changedKeys: ["providers.temperature"],
      actor: "42",
      correlationId: "c-1",
      timestamp: new Date(),
      version: 1 as const,
    };
    bus.publish(changed);
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toContain(7);
  });

  it("reports registered/active/error counts", async () => {
    const center = new ConfigCenter();
    await center.init();
    const manager = new PluginManager({ sdk: center.sdk });
    manager.register(baseManifest({}), {});
    await manager.start("com.lumes.temperature");
    const rep = manager.report();
    expect(rep.registeredCount).toBe(1);
    expect(rep.activeCount).toBe(1);
    expect(rep.host.sdkVersion).toBe("1.0.0");
  });
});
