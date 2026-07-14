import { describe, it, expect, beforeEach } from "vitest";
import type { OperationalSituation } from "../../src/operational-decision-engine/core/types";

const makeSituation = (overrides?: Partial<OperationalSituation>): OperationalSituation => ({
  id: "sit-test-001",
  domain: "sales",
  title: "Test Situation",
  description: "A test situation for simulation",
  severity: "medium",
  sourceFacts: ["fact-1"],
  priority: 50,
  priorityRationale: "Test",
  approvalLevel: "manager",
  approvalRationale: "Test",
  candidateDecisions: [],
  timestamp: new Date(),
  source: "rule",
  ...overrides,
});

beforeEach(async () => {
  const { NorthStarConfiguration } = await import("../../src/north-star/NorthStarConfiguration");
  NorthStarConfiguration.reset();
});

describe("ScenarioBuilder", () => {
  it("should build 5 variants for all directions", async () => {
    const { buildVariants } = await import("../../src/strategy-simulator/ScenarioBuilder");
    const variants = buildVariants(makeSituation());
    expect(variants.length).toBe(5);
    expect(variants.map((v) => v.direction).sort()).toEqual([
      "cost_reduction", "growth", "optimization", "quality", "risk_mitigation",
    ]);
  });

  it("should build a single variant with overrides", async () => {
    const { buildVariant } = await import("../../src/strategy-simulator/ScenarioBuilder");
    const v = buildVariant(makeSituation(), { direction: "growth", riskTolerance: "low", availableBudget: 500000 });
    expect(v.direction).toBe("growth");
    expect(v.riskTolerance).toBe("low");
    expect(v.availableBudget).toBe(500000);
  });

  it("should convert variant to partial context", async () => {
    const { buildVariant, variantToPartialContext } = await import("../../src/strategy-simulator/ScenarioBuilder");
    const v = buildVariant(makeSituation(), { cashAvailable: 999999 });
    const ctx = variantToPartialContext(v, makeSituation());
    expect(ctx.businessState.cashAvailable).toBe(999999);
    expect(ctx.riskProfile.riskTolerance).toBe("medium");
  });
});

describe("StrategySimulator", () => {
  it("should run all 5 simulation variants", async () => {
    const { runSimulation } = await import("../../src/strategy-simulator/StrategySimulator");
    const results = runSimulation(makeSituation());
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r.status).toBe("completed");
      expect(r.northStarAlignment.overallScore).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0);
    });
  });

  it("should run single variant with correct direction", async () => {
    const { runSingleVariant } = await import("../../src/strategy-simulator/StrategySimulator");
    const { buildVariant } = await import("../../src/strategy-simulator/ScenarioBuilder");
    const v = buildVariant(makeSituation(), { direction: "cost_reduction" });
    const result = runSingleVariant(makeSituation(), v);
    expect(result.direction).toBe("cost_reduction");
    expect(result.status).toBe("completed");
    expect(result.durationMs).toBeLessThan(5000);
  });

  it("should include context when provided", async () => {
    const { runSimulation } = await import("../../src/strategy-simulator/StrategySimulator");
    const results = runSimulation(makeSituation(), {
      id: "ctx-test",
      generatedAt: new Date().toISOString(),
      businessState: { cashAvailable: 500000, activeBranches: 1, activeEmployees: 10, currentWorkload: 0.8, operatingHours: 8 },
      resources: { inventoryAvailability: 0.5, productionCapacity: 0.4, logisticsCapacity: 0.3, availableBudget: 500000 },
      strategicContext: { activeCampaigns: [], currentQuarterGoals: [], northStarWeights: {}, founderPriority: [] },
      operationalContext: {},
      riskProfile: { riskTolerance: "low", maximumBudgetExposure: 1000000, currentOperationalRisk: 0.8 },
    });
    expect(results.length).toBe(5);
    results.forEach((r) => expect(r.status).toBe("completed"));
  });
});

describe("StrategyComparator", () => {
  it("should rank completed simulations by score", async () => {
    const { runSimulation } = await import("../../src/strategy-simulator/StrategySimulator");
    const { compareSimulations } = await import("../../src/strategy-simulator/StrategyComparator");
    const results = runSimulation(makeSituation());
    const report = compareSimulations(results);
    expect(report.simulations.length).toBe(5);
    expect(report.topRanked).not.toBeNull();
    for (let i = 1; i < report.simulations.length; i++) {
      expect(report.simulations[i - 1].overallScore).toBeGreaterThanOrEqual(report.simulations[i].overallScore);
    }
    expect(report.spread).toBeGreaterThan(0);
  });

  it("should handle empty results", async () => {
    const { compareSimulations } = await import("../../src/strategy-simulator/StrategyComparator");
    const report = compareSimulations([]);
    expect(report.simulations.length).toBe(0);
    expect(report.topRanked).toBeNull();
    expect(report.spread).toBe(0);
  });
});

describe("SensitivityAnalyzer", () => {
  it("should analyze sensitivity across factors", async () => {
    const { analyzeSensitivity } = await import("../../src/strategy-simulator/SensitivityAnalyzer");
    const report = analyzeSensitivity(makeSituation());
    expect(report.factors.length).toBe(3);
    expect(report.mostSensitive).not.toBeNull();
    expect(report.leastSensitive).not.toBeNull();
    expect(report.baseResult.status).toBe("completed");
  });
});

describe("ForecastEngine", () => {
  it("should forecast KPI outcomes from an objective", async () => {
    const { forecastOutcomes } = await import("../../src/strategy-simulator/ForecastEngine");
    const { buildStrategy } = await import("../../src/strategy-engine/core/StrategyBuilder");
    const objective = buildStrategy(makeSituation({ domain: "finance" }));
    const forecast = forecastOutcomes(objective);
    expect(forecast.kpis.length).toBeGreaterThan(0);
    forecast.kpis.forEach((kpi) => {
      expect(kpi.probability).toBeGreaterThan(0);
      expect(kpi.confidenceInterval.low).toBeLessThanOrEqual(kpi.confidenceInterval.high);
    });
    expect(forecast.overallConfidence).toBeGreaterThan(0);
    expect(forecast.summary).toBeTruthy();
  });
});

describe("StrategySimulatorProvider", () => {
  it("should simulate, compare, sensitivity, and forecast via facade", async () => {
    const { StrategySimulatorProvider } = await import("../../src/strategy-simulator/StrategySimulatorProvider");
    const sim = StrategySimulatorProvider.simulate(makeSituation());
    expect(sim.length).toBe(5);

    const comp = StrategySimulatorProvider.compare(sim);
    expect(comp.simulations.length).toBe(5);

    const sens = StrategySimulatorProvider.sensitivity(makeSituation());
    expect(sens.factors.length).toBe(3);

    StrategySimulatorProvider.clearCache();
  });

  it("should cache simulation results", async () => {
    const { StrategySimulatorProvider } = await import("../../src/strategy-simulator/StrategySimulatorProvider");
    const sit = makeSituation({ id: "sit-cache-test" });
    const r1 = StrategySimulatorProvider.simulate(sit);
    const r2 = StrategySimulatorProvider.simulate(sit);
    expect(r1).toBe(r2);
    StrategySimulatorProvider.clearCache();
    const r3 = StrategySimulatorProvider.simulate(sit);
    expect(r1).not.toBe(r3);
  });

  it("should initialize without error", async () => {
    const { initializeStrategySimulator } = await import("../../src/strategy-simulator");
    expect(() => initializeStrategySimulator()).not.toThrow();
  });
});
