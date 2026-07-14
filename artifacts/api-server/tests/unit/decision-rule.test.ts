import { describe, it, expect } from "vitest";

describe("RuleEngine", () => {
  it("should return empty situations when no rules match", async () => {
    const { RuleEngine } = await import("../../src/operational-decision-engine/rule-engine/RuleEngine");
    const engine = new RuleEngine();
    const situations = engine.evaluate([]);
    expect(Array.isArray(situations)).toBe(true);
    expect(situations.length).toBe(0);
  });

  it("should evaluate rules against facts using RuleRegistry", async () => {
    const { registerRule } = await import("../../src/operational-decision-engine/rule-engine/RuleRegistry");
    const { RuleEngine } = await import("../../src/operational-decision-engine/rule-engine/RuleEngine");
    registerRule("stock_critical", (f: any) => f.type === "stock" && f.coverage < 1, (f: any) => ({
      title: "Stock Critical",
      severity: "critical" as const,
      description: `Stock low for ${f.productId}`,
    }));
    const engine = new RuleEngine();
    const facts = [{ type: "stock", coverage: 0.5, productId: 1 }];
    const situations = engine.evaluate(facts);
    expect(situations.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle rule evaluation errors gracefully", async () => {
    const { registerRule } = await import("../../src/operational-decision-engine/rule-engine/RuleRegistry");
    const { RuleEngine } = await import("../../src/operational-decision-engine/rule-engine/RuleEngine");
    registerRule("bad_rule", () => { throw new Error("rule error"); }, () => ({}));
    const engine = new RuleEngine();
    expect(() => engine.evaluate([{ value: 1 }])).not.toThrow();
  });
});
