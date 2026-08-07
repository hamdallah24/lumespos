import { describe, it, expect, beforeEach } from "vitest";
import { ConfigurationRegistry } from "../../../src/settings/registry";
import { ConfigurationResolver, type ScopedOverrideSet } from "../../../src/settings/resolver";
import { SettingsStore } from "../../../src/settings/store";
import { ConfigSecurity, type WriteActor } from "../../../src/settings/security";
import { ConfigEventBus, createConfigurationChangedEvent } from "../../../src/settings/events";
import { ConfigSubscriber } from "../../../src/settings/subscriber";
import { ConfigurationPipeline } from "../../../src/settings/pipeline";
import { createConfigSDK } from "../../../src/settings/sdk";
import { registerDefaultConfiguration } from "../../../src/settings/defaults";

function makeRegistry() {
  const r = new ConfigurationRegistry();
  registerDefaultConfiguration(r, { freeze: true });
  return r;
}

describe("ConfigurationRegistry", () => {
  it("rejects duplicate registration", () => {
    const r = new ConfigurationRegistry();
    r.register({ key: "a.b", title: "A", category: "x", type: "string", defaultValue: "", scope: ["default"] });
    expect(() => r.register({ key: "a.b", title: "A2", category: "x", type: "string", defaultValue: "", scope: ["default"] }))
      .toThrow(/duplicate/);
  });

  it("freezes after bootstrap", () => {
    const r = new ConfigurationRegistry();
    r.freeze();
    expect(() => r.register({ key: "a.b", title: "A", category: "x", type: "string", defaultValue: "", scope: ["default"] }))
      .toThrow(/FROZEN/);
  });

  it("require() rejects unknown keys — no hardcoded keys outside Registry", () => {
    const r = makeRegistry();
    expect(() => r.require("providers.nonexistent.key")).toThrow(/unknown configuration key/);
  });

  it("validates field types", () => {
    const r = makeRegistry();
    expect(r.validateField("providers.temperature", 0.5)).toEqual([]);
    expect(r.validateField("providers.temperature", "hot").length).toBeGreaterThan(0);
  });
});

describe("ConfigurationResolver — scope chain", () => {
  let registry: ConfigurationRegistry;
  let store: SettingsStore;

  beforeEach(() => {
    registry = makeRegistry();
    store = new SettingsStore();
  });

  it("resolves DEFAULT when no override exists", async () => {
    const resolver = new ConfigurationResolver(registry, store);
    const resolved = await resolver.resolve("providers.temperature", {});
    expect(resolved.value).toBe(0.7);
    expect(resolved.source.type).toBe("default");
    expect(resolved.inherited).toBe(false);
  });

  it("BRANCH overrides DEFAULT for the matching branch only", async () => {
    store.commit({ type: "branch", branchId: 5 }, { "providers.temperature": 0.9 }, "tester", "c1");
    const resolver = new ConfigurationResolver(registry, store);

    const b5 = await resolver.resolve("providers.temperature", { branchId: 5 });
    expect(b5.value).toBe(0.9);
    expect(b5.source).toEqual({ type: "branch", branchId: 5 });

    const b9 = await resolver.resolve("providers.temperature", { branchId: 9 });
    expect(b9.value).toBe(0.7); // falls back to default for unrelated branch
  });

  it("EXECUTIVE overrides BRANCH (most-specific wins)", async () => {
    store.commit({ type: "branch", branchId: 5 }, { "executives.CEO.temperature": 0.8 }, "tester", "c1");
    store.commit({ type: "executive", executiveRole: "CEO" }, { "executives.CEO.temperature": 1.0 }, "tester", "c2");

    const resolver = new ConfigurationResolver(registry, store);
    const resolved = await resolver.resolve("executives.CEO.temperature", { branchId: 5, executiveRole: "CEO" });
    expect(resolved.value).toBe(1.0);
    expect(resolved.source.type).toBe("executive");
  });

  it("effective() returns all registered keys", async () => {
    const resolver = new ConfigurationResolver(registry, store);
    const eff = await resolver.effective({});
    expect(eff["providers.temperature"]).toBe(0.7);
    expect(eff["providers.deepseek.model"]).toBe("deepseek-chat");
    expect(Object.keys(eff).length).toBeGreaterThan(20);
  });

  it("trace() exposes inheritance path", async () => {
    store.commit({ type: "workspace", workspaceId: 1 }, { "providers.temperature": 0.75 }, "tester", "c1");
    const resolver = new ConfigurationResolver(registry, store);
    const trace = await resolver.trace("providers.temperature", { workspaceId: 1 });
    // trace includes all layers; last effective value should win
    const effective = trace[trace.length - 1];
    expect(effective.value).toBe(0.75);
  });
});

describe("SettingsStore — Revision model", () => {
  it("commits immutable revisions with monotonic sequence", () => {
    const store = new SettingsStore();
    const r1 = store.commit({ type: "workspace", workspaceId: 1 }, { a: 1 }, "u1", "c1");
    const r2 = store.commit({ type: "workspace", workspaceId: 1 }, { a: 2 }, "u1", "c2");
    expect(r1.revision).toBe(1);
    expect(r2.revision).toBe(2);
    expect(store.revisionCount).toBe(2);
    expect(store.log).toHaveLength(2);
    expect(store.log[1].changes).toEqual({ a: 2 });
    expect(store.log[0].correlationId).toBe("c1");
  });
});

describe("ConfigSecurity", () => {
  let registry: ConfigurationRegistry;
  beforeEach(() => { registry = makeRegistry(); });

  it("scrubs secret values", () => {
    const sec = new ConfigSecurity(registry);
    expect(sec.scrubValue("sk-abc", true)).toBe("••••••••");
    expect(sec.scrubValue("sk-abc", false)).toBe("sk-abc");
    expect(sec.scrubValue("", true)).toBe("");
  });

  it("enforces RBAC scope grants", () => {
    const sec = new ConfigSecurity(registry);
    expect(sec.canWrite("owner", { type: "workspace", workspaceId: 1 }).ok).toBe(true);
    expect(sec.canWrite("viewer", { type: "workspace", workspaceId: 1 }).ok).toBe(false);
    expect(sec.canWrite("developer", { type: "executive", executiveRole: "CEO" }).ok).toBe(true);
  });

  it("protects BOLA — manager cannot touch other branches", () => {
    const sec = new ConfigSecurity(registry);
    const actor: WriteActor = { actorId: "1", role: "manager", branchId: 5 };
    expect(sec.canAccessObject(actor, { type: "branch", branchId: 5 }).ok).toBe(true);
    expect(sec.canAccessObject(actor, { type: "branch", branchId: 9 }).ok).toBe(false);
  });

  it("rejects mass-assignment unknown fields", () => {
    const sec = new ConfigSecurity(registry);
    const result = sec.whitelist("providers", { "providers.temperature": 0.8, "totally.unknown": 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/mass-assignment/);
  });
});

describe("ConfigEventBus + ConfigSubscriber", () => {
  it("publishes notification events without values; subscriber reconciles via SDK", async () => {
    const registry = makeRegistry();
    const store = new SettingsStore();
    const resolver = new ConfigurationResolver(registry, store);
    const sdk = createConfigSDK(resolver);
    const bus = new ConfigEventBus();

    const seen = new Map<string, number>();
    const subscriber = new ConfigSubscriber({
      sdk,
      bus,
      keys: ["providers.temperature"],
      onReconcile: async (snapshot) => {
        for (const [k, v] of Object.entries(snapshot)) seen.set(k, v as number);
      },
    });
    subscriber.start();

    store.commit({ type: "workspace", workspaceId: 1 }, { "providers.temperature": 0.85 }, "u1", "c1");
    bus.publish(createConfigurationChangedEvent({
      revision: 1,
      scope: { type: "workspace", workspaceId: 1 },
      changedKeys: ["providers.temperature"],
      actor: "u1",
      correlationId: "c1",
    }));

    await new Promise((r) => setTimeout(r, 10));
    expect(seen.get("providers.temperature")).toBe(0.85);
    expect(subscriber.lastRevision).toBe(1);
  });

  it("ignores stale/duplicate events via monotonic revision", async () => {
    const bus = new ConfigEventBus();
    let calls = 0;
    bus.on("test", () => { calls += 1; });
    bus.publish(createConfigurationChangedEvent({ revision: 1, scope: { type: "default" }, changedKeys: [], actor: "u", correlationId: "c" }));
    bus.publish(createConfigurationChangedEvent({ revision: 1, scope: { type: "default" }, changedKeys: [], actor: "u", correlationId: "c" }));
    bus.publish(createConfigurationChangedEvent({ revision: 0, scope: { type: "default" }, changedKeys: [], actor: "u", correlationId: "c" }));
    expect(calls).toBe(1);
  });
});

describe("ConfigurationPipeline", () => {
  it("commits change end-to-end and emits notification (no APPLY phase)", async () => {
    const registry = makeRegistry();
    const store = new SettingsStore();
    const resolver = new ConfigurationResolver(registry, store);
    const bus = new ConfigEventBus();
    const security = new ConfigSecurity(registry);

    let notified = false;
    bus.on("watch", () => { notified = true; });

    const pipeline = new ConfigurationPipeline({ registry, security, resolver, store, bus });
    const run = await pipeline.run({
      actor: { actorId: "42", role: "owner" },
      scope: { type: "branch", branchId: 5 },
      changes: { "providers.temperature": 0.8 },
    });

    expect(run.state).toBe("SNAPSHOT");
    expect(run.revision).toBe(1);
    expect(run.validation!.ok).toBe(true);
    expect(run.preview!.after["providers.temperature"]).toBe(0.8);
    expect(run.impact).toContain("llm-adapter");
    expect(run.simulation!.length).toBeGreaterThan(0);

    // store is single source of truth
    const resolved = await resolver.resolve("providers.temperature", { branchId: 5 });
    expect(resolved.value).toBe(0.8);
  });

  it("aborts on validation failure — nothing committed", async () => {
    const registry = makeRegistry();
    const store = new SettingsStore();
    const resolver = new ConfigurationResolver(registry, store);
    const bus = new ConfigEventBus();
    const security = new ConfigSecurity(registry);
    const pipeline = new ConfigurationPipeline({ registry, security, resolver, store, bus });

    const run = await pipeline.run({
      actor: { actorId: "42", role: "owner" },
      scope: { type: "branch", branchId: 5 },
      changes: { "providers.temperature": "not-a-number" },
    });

    expect(run.validation!.ok).toBe(false);
    expect(store.revisionCount).toBe(0);
    expect(run.state).toBe("DRAFT");
  });

  it("denies write by RBAC policy", async () => {
    const registry = makeRegistry();
    const store = new SettingsStore();
    const resolver = new ConfigurationResolver(registry, store);
    const bus = new ConfigEventBus();
    const security = new ConfigSecurity(registry);
    const pipeline = new ConfigurationPipeline({ registry, security, resolver, store, bus });

    const run = await pipeline.run({
      actor: { actorId: "9", role: "viewer" },
      scope: { type: "workspace", workspaceId: 1 },
      changes: { "providers.temperature": 0.8 },
    });

    expect(run.policy!.ok).toBe(false);
    expect(store.revisionCount).toBe(0);
  });
});
