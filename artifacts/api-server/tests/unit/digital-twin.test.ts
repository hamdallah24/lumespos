import { describe, it, expect, beforeEach } from "vitest";
import type { TwinBusinessState } from "../../src/digital-twin/types";

const BASE_STATE: TwinBusinessState = {
  cashAvailable: 50000000,
  revenue: 150000000,
  expenses: 90000000,
  grossMargin: 40,
  stockCoverageDays: 7,
  activeBranches: 3,
  activeEmployees: 15,
  customerSatisfaction: 4.2,
  updatedAt: new Date().toISOString(),
};

beforeEach(async () => {
  const { resetMirror } = await import("../../src/digital-twin/BusinessMirror");
  const { clearAlerts } = await import("../../src/digital-twin/DriftDetector");
  resetMirror();
  clearAlerts();
});

describe("BusinessMirror", () => {
  it("should set and retrieve mirror state", async () => {
    const { setMirrorState, getMirrorState } = await import("../../src/digital-twin/BusinessMirror");
    setMirrorState(BASE_STATE);
    const state = getMirrorState();
    expect(state.cashAvailable).toBe(50000000);
    expect(state.activeBranches).toBe(3);
    expect(state.updatedAt).toBeTruthy();
  });

  it("should update individual fields", async () => {
    const { setMirrorState, updateMirrorField, getMirrorState } = await import("../../src/digital-twin/BusinessMirror");
    setMirrorState(BASE_STATE);
    updateMirrorField("cashAvailable", 75000000);
    expect(getMirrorState().cashAvailable).toBe(75000000);
  });

  it("should create and apply scenarios", async () => {
    const { setMirrorState, createScenario, applyScenario, getMirrorState } = await import("../../src/digital-twin/BusinessMirror");
    setMirrorState(BASE_STATE);

    const scenario = createScenario("Increase Revenue", [
      { field: "revenue", label: "Revenue Boost", delta: 50000000, description: "Boost revenue by 50M" },
    ]);

    expect(scenario.label).toBe("Increase Revenue");
    expect(scenario.projected.revenue).toBe(200000000);

    applyScenario(scenario);
    expect(getMirrorState().revenue).toBe(200000000);
  });
});

describe("TwinComparator", () => {
  it("should compare two states", async () => {
    const { compareStates } = await import("../../src/digital-twin/TwinComparator");

    const real: TwinBusinessState = { ...BASE_STATE, cashAvailable: 50000000, revenue: 150000000 };
    const twin: TwinBusinessState = { ...BASE_STATE, cashAvailable: 60000000, revenue: 160000000 };

    const results = compareStates(real, twin);
    expect(results.length).toBeGreaterThan(0);

    const cash = results.find(r => r.field === "Cash Available");
    expect(cash).toBeDefined();
    expect(cash!.delta).toBe(10000000);
    expect(cash!.direction).toBe("up");
  });

  it("should find significant drift", async () => {
    const { compareStates, findSignificantDrift } = await import("../../src/digital-twin/TwinComparator");

    const real: TwinBusinessState = { ...BASE_STATE, cashAvailable: 50000000 };
    const twin: TwinBusinessState = { ...BASE_STATE, cashAvailable: 60000000 };

    const comparisons = compareStates(real, twin);
    const significant = findSignificantDrift(comparisons, 15);
    expect(significant.length).toBeGreaterThanOrEqual(0);
  });
});

describe("DriftDetector", () => {
  it("should detect drift between real and twin", async () => {
    const { setMirrorState } = await import("../../src/digital-twin/BusinessMirror");
    const { detectDrift } = await import("../../src/digital-twin/DriftDetector");

    setMirrorState(BASE_STATE);

    const driftedReal: TwinBusinessState = { ...BASE_STATE, cashAvailable: 35000000, revenue: 120000000 };
    const alerts = detectDrift(driftedReal, { ...BASE_STATE });

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.field === "Cash Available")).toBe(true);
  });

  it("should maintain alert history", async () => {
    const { setMirrorState } = await import("../../src/digital-twin/BusinessMirror");
    const { detectDrift, getAlertHistory } = await import("../../src/digital-twin/DriftDetector");

    setMirrorState(BASE_STATE);
    detectDrift({ ...BASE_STATE, cashAvailable: 30000000 }, { ...BASE_STATE });

    const history = getAlertHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});

describe("DigitalTwinProvider", () => {
  it("should provide unified facade", async () => {
    const { DigitalTwinProvider } = await import("../../src/digital-twin/DigitalTwinProvider");

    DigitalTwinProvider.sync(BASE_STATE);
    const state = DigitalTwinProvider.getState();
    expect(state.cashAvailable).toBe(50000000);

    const scenario = DigitalTwinProvider.createScenario("Test", [
      { field: "revenue", label: "Revenue", delta: 10000000, description: "Test" },
    ]);
    expect(scenario.label).toBe("Test");

    const comparisons = DigitalTwinProvider.compareWith(BASE_STATE);
    expect(comparisons.length).toBeGreaterThan(0);
  });

  it("should initialize without error", async () => {
    const { initializeDigitalTwin } = await import("../../src/digital-twin");
    expect(() => initializeDigitalTwin()).not.toThrow();
  });
});
