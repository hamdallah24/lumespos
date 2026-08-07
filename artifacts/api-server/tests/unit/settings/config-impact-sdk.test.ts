// ConfigCenter — Milestone 6 Phase 2: Impact Provider SDK acceptance tests.
// Covers: registerImpactProvider()/unregister, eligibility by category/key,
// Capability Discovery, and the Impact Analyzer (Simulation Extension) driven
// by the locked pipeline's read-only plan().

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigCenter } from "../../../src/settings";
import { ImpactAnalyzer } from "../../../src/settings/impact/analyzer";
import { ImpactProviderRegistry, registerImpactProvider, unregisterImpactProvider } from "../../../src/settings/impact/providers";
import type { ImpactChange, ImpactProviderDefinition } from "../../../src/settings/impact/types";
import type { WriteActor } from "../../../src/settings/security";
import type { ConfigScope } from "../../../src/settings/types";

const actor: WriteActor = { actorId: "1", role: "manager" };
const scope: ConfigScope = { type: "workspace", workspaceId: 1 };

describe("registerImpactProvider + eligibility", () => {
  let center: ConfigCenter;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    ImpactProviderRegistry.reset();
  });

  it("registers a provider and matches it to a key", () => {
    const provider: ImpactProviderDefinition = {
      id: "temp.provider",
      name: "Temperature",
      version: "1.0.0",
      keys: ["providers.temperature"],
      estimate: () => ({ key: "providers.temperature", provider: "temp.provider", severity: "high", summary: "affects cost", detail: "", subsystems: ["llm.cost"] }),
    };
    registerImpactProvider(center.registry, provider);
    const change: ImpactChange = {
      key: "providers.temperature",
      before: 0.5,
      after: 0.7,
      meta: center.registry.require("providers.temperature"),
      scopeType: "workspace",
    };
    expect(ImpactProviderRegistry.get().eligible(change)).toHaveLength(1);
    const unknown: ImpactChange = { key: "providers.unknown", before: 1, after: 2, meta: center.registry.require("providers.defaultProvider"), scopeType: "workspace" };
    expect(ImpactProviderRegistry.get().eligible(unknown)).toHaveLength(0);
  });

  it("rejects duplicate registration and supports unregister", () => {
    const p: ImpactProviderDefinition = { id: "dup", name: "D", version: "1.0.0", estimate: () => null };
    registerImpactProvider(center.registry, p);
    expect(() => registerImpactProvider(center.registry, p)).toThrow(/already registered/);
    expect(unregisterImpactProvider("dup")).toBe(true);
    expect(ImpactProviderRegistry.get().has("dup")).toBe(false);
  });

  it("discovers capabilities", () => {
    const p: ImpactProviderDefinition = { id: "cap.p", name: "Cap", version: "1.0.0", capabilities: ["cost.estimation", "subsystem.grounding"] };
    registerImpactProvider(center.registry, p);
    const res = ImpactProviderRegistry.get().capabilitiesOf(["cost.estimation"]);
    expect(res.providers.map((x) => x.id)).toContain("cap.p");
    expect(res.capabilities).toContain("subsystem.grounding");
  });
});

describe("ImpactAnalyzer — Simulation Extension (consumer of plan())", () => {
  let center: ConfigCenter;
  let analyzer: ImpactAnalyzer;

  beforeEach(async () => {
    center = new ConfigCenter();
    await center.init();
    ImpactProviderRegistry.reset();
    analyzer = new ImpactAnalyzer({ registry: center.registry, pipeline: center.pipeline });
  });

  it("enriches estimates and expands impacted subsystems, never committing", async () => {
    registerImpactProvider(center.registry, {
      id: "temp.provider",
      name: "Temperature",
      version: "1.0.0",
      keys: ["providers.temperature"],
      estimate: () => ({ key: "providers.temperature", provider: "temp.provider", severity: "high", summary: "cost ↑", detail: "temp rise", subsystems: ["llm.cost.integration"] }),
    });
    const before = center.store.revisionCount;
    const report = await analyzer.analyze({
      actor,
      scope,
      changes: { "providers.temperature": 0.9 },
    });
    expect(report.estimates).toHaveLength(1);
    expect(report.estimates[0].provider).toBe("temp.provider");
    expect(report.impacted).toContain("llm.cost.integration");
    expect(report.participatingProviders).toEqual(["temp.provider"]);
    // consumer guarantee: no revision was created
    expect(center.store.revisionCount).toBe(before);
    expect(report.baseline.length).toBeGreaterThan(0);
  });

  it("keeps baseline simulation (metadata-driven) alongside estimates", async () => {
    const report = await analyzer.analyze({ actor, scope, changes: { "providers.temperature": 0.9 } });
    expect(report.baseline.length).toBeGreaterThan(0);
    // no providers registered → still returns baseline-driven impacted set
    expect(Array.isArray(report.impacted)).toBe(true);
  });

  it("provider declining returns no estimate and does not throw", async () => {
    registerImpactProvider(center.registry, {
      id: "decliner",
      name: "Decliner",
      version: "1.0.0",
      keys: ["providers.temperature"],
      estimate: () => null,
    });
    const report = await analyzer.analyze({ actor, scope, changes: { "providers.temperature": 0.9 } });
    expect(report.estimates).toHaveLength(0);
    expect(report.participatingProviders).toEqual([]);
  });

  it("aggregates multiple providers on the same key", async () => {
    registerImpactProvider(center.registry, {
      id: "p1", name: "P1", version: "1.0.0", keys: ["providers.temperature"],
      estimate: () => ({ key: "providers.temperature", provider: "p1", severity: "low", summary: "a", detail: "d", subsystems: ["s1"] }),
    });
    registerImpactProvider(center.registry, {
      id: "p2", name: "P2", version: "1.0.0", keys: ["providers.temperature"],
      estimate: () => ({ key: "providers.temperature", provider: "p2", severity: "medium", summary: "b", detail: "e", subsystems: ["s2"] }),
    });
    const report = await analyzer.analyze({ actor, scope, changes: { "providers.temperature": 0.9 } });
    expect(report.estimates).toHaveLength(2);
    expect(report.impacted).toEqual(expect.arrayContaining(["s1", "s2"]));
  });
});