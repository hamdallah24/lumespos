import { describe, it, expect, beforeEach } from "vitest";

describe("NorthStarProvider", () => {
  beforeEach(async () => {
    const { NorthStarConfiguration } = await import("../../src/north-star/NorthStarConfiguration");
    NorthStarConfiguration.reset();
  });

  it("should get current configuration", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    const config = NorthStarProvider.getConfig();
    expect(config.objectives.length).toBe(7);
  });

  it("should apply quarterly preset", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    NorthStarProvider.applyQuarterlyPreset("Q2");
    const config = NorthStarProvider.getConfig();
    const growthWeight = config.objectives.find((o: any) => o.id === "NS-001")?.weight;
    expect(growthWeight).toBe(30);
  });

  it("should get current weights", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    const weights = NorthStarProvider.getCurrentWeights();
    expect(weights["NS-001"]).toBeDefined();
  });

  it("should get current priority", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    const priority = NorthStarProvider.getCurrentPriority();
    expect(priority.length).toBe(7);
    expect(priority[0]).toBe("NS-001");
  });

  it("should evaluate a strategy direction", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    const result = NorthStarProvider.evaluateStrategy("optimization");
    expect(result.score).toBeGreaterThan(0);
    expect(result.dimensions.length).toBe(7);
  });

  it("should apply current quarter automatically", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    expect(() => NorthStarProvider.applyCurrentQuarter()).not.toThrow();
  });
});

describe("NorthStarAligner (dynamic weights)", () => {
  beforeEach(async () => {
    const { NorthStarConfiguration } = await import("../../src/north-star/NorthStarConfiguration");
    NorthStarConfiguration.reset();
  });

  it("should align with dynamic weights from NorthStarConfiguration", async () => {
    const { alignWithNorthStar } = await import("../../src/strategy-engine/core/NorthStarAligner");
    const result = alignWithNorthStar("optimization");
    expect(result.dimensions.length).toBe(7);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it("should reflect updated weights after quarterly change", async () => {
    const { NorthStarProvider } = await import("../../src/north-star/providers/NorthStarProvider");
    const { alignWithNorthStar } = await import("../../src/strategy-engine/core/NorthStarAligner");

    NorthStarProvider.applyQuarterlyPreset("profitability");

    const result = alignWithNorthStar("cost_reduction");
    const marginDim = result.dimensions.find((d) => d.name === "Gross Margin");
    expect(marginDim).toBeDefined();
    expect(marginDim!.weight).toBeGreaterThan(0.3);
  });
});
