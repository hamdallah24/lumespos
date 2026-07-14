import { describe, it, expect, beforeEach } from "vitest";

describe("DecisionContext", () => {
  beforeEach(async () => {
    const { setBusinessStateOverrides } = await import("../../src/decision-context/BusinessStateCollector");
    const { setResourceState } = await import("../../src/decision-context/ResourceAnalyzer");
    const { setStrategicContext } = await import("../../src/decision-context/StrategicContextBuilder");
    const { setOperationalContext } = await import("../../src/decision-context/OperationalContextBuilder");
    const { setRiskProfile } = await import("../../src/decision-context/RiskProfileAnalyzer");
    setBusinessStateOverrides({});
    setResourceState({});
    setStrategicContext({});
    setOperationalContext({});
    setRiskProfile({});
  });

  it("should build a complete DecisionContext with defaults", async () => {
    const { buildDecisionContext } = await import("../../src/decision-context/DecisionContextBuilder");
    const ctx = buildDecisionContext();
    expect(ctx.id).toContain("ctx-");
    expect(ctx.businessState).toBeDefined();
    expect(ctx.businessState.cashAvailable).toBe(0);
    expect(ctx.resources.availableBudget).toBe(0);
    expect(ctx.strategicContext.northStarWeights.profitability).toBe(0.25);
    expect(ctx.operationalContext.seasonality).toBeDefined();
    expect(ctx.riskProfile.riskTolerance).toBe("medium");
  });

  it("should generate context for a specific domain", async () => {
    const { ContextProvider } = await import("../../src/decision-context/ContextProvider");
    const ctx = ContextProvider.generateForSituation("inventory");
    expect(ctx.id).toContain("inventory");
    expect(ContextProvider.getLast()).toBe(ctx);
  });

  it("should allow state overrides via BusinessStateCollector", async () => {
    const { setBusinessStateOverrides } = await import("../../src/decision-context/BusinessStateCollector");
    const { collectBusinessState } = await import("../../src/decision-context/BusinessStateCollector");
    setBusinessStateOverrides({ cashAvailable: 500000000, activeBranches: 5 });
    const state = collectBusinessState();
    expect(state.cashAvailable).toBe(500000000);
    expect(state.activeBranches).toBe(5);
  });

  it("should allow strategic context overrides", async () => {
    const { setStrategicContext } = await import("../../src/decision-context/StrategicContextBuilder");
    const { buildStrategicContext } = await import("../../src/decision-context/StrategicContextBuilder");
    setStrategicContext({ activeCampaigns: ["promo-ramadhan"], founderPriority: ["profit", "growth"] });
    const ctx = buildStrategicContext();
    expect(ctx.activeCampaigns).toEqual(["promo-ramadhan"]);
    expect(ctx.founderPriority).toEqual(["profit", "growth"]);
  });

  it("should generate risk profile", async () => {
    const { setRiskProfile } = await import("../../src/decision-context/RiskProfileAnalyzer");
    const { analyzeRiskProfile } = await import("../../src/decision-context/RiskProfileAnalyzer");
    setRiskProfile({ riskTolerance: "low", currentOperationalRisk: 0.8 });
    const profile = analyzeRiskProfile();
    expect(profile.riskTolerance).toBe("low");
    expect(profile.currentOperationalRisk).toBe(0.8);
  });
});

describe("DecisionContext → StrategyBuilder wiring", () => {
  it("should create strategy with context influencing confidence", async () => {
    const { buildDecisionContext } = await import("../../src/decision-context/DecisionContextBuilder");
    const { setBusinessStateOverrides } = await import("../../src/decision-context/BusinessStateCollector");
    const { setRiskProfile } = await import("../../src/decision-context/RiskProfileAnalyzer");
    const { buildStrategy } = await import("../../src/strategy-engine/core/StrategyBuilder");

    setBusinessStateOverrides({ cashAvailable: 500000 });
    setRiskProfile({ currentOperationalRisk: 0.8 });

    const ctx = buildDecisionContext();

    const situation = {
      id: "sit-test",
      domain: "inventory",
      title: "Stock Critical",
      description: "Stock below reorder point",
      severity: "critical",
      sourceFacts: [],
      candidateDecisions: [],
      timestamp: new Date(),
    } as any;

    const strategy = buildStrategy(situation, ctx);
    expect(strategy).toBeDefined();
    expect(strategy.sourceSituationId).toBe("sit-test");
    expect(strategy.confidence).toBeLessThanOrEqual(100);
  });

  it("should create strategy without context (backward compat)", async () => {
    const { buildStrategy } = await import("../../src/strategy-engine/core/StrategyBuilder");
    const situation = {
      id: "sit-test-2", domain: "sales", title: "Revenue Drop",
      description: "Sales declined", severity: "high",
      sourceFacts: [], candidateDecisions: [],
      timestamp: new Date(),
    } as any;
    const strategy = buildStrategy(situation);
    expect(strategy).toBeDefined();
    expect(strategy.id).toContain("strategy-sales");
  });
});
