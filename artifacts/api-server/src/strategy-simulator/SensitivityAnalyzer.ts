import type { OperationalSituation } from "../operational-decision-engine/core/types";
import type { SimulationVariant, SimulationResult, SensitivityFactor, SensitivityReport } from "./types";
import { runSingleVariant } from "./StrategySimulator";
import { buildVariant } from "./ScenarioBuilder";

const FACTOR_DEFS: { name: string; field: keyof SimulationVariant; base: number; varied: (base: number) => number; label: (v: number) => string }[] = [
  { name: "availableBudget", field: "availableBudget", base: 3000000, varied: () => 500000, label: (v) => `Budget Rp${(v / 1e6).toFixed(0)}jt` },
  { name: "cashAvailable", field: "cashAvailable", base: 5000000, varied: () => 500000, label: (v) => `Kas Rp${(v / 1e6).toFixed(0)}jt` },
  { name: "currentOperationalRisk", field: "currentOperationalRisk", base: 0.4, varied: () => 0.9, label: (v) => `Risiko ${(v * 100).toFixed(0)}%` },
];

export function analyzeSensitivity(
  situation: OperationalSituation,
): SensitivityReport {
  const baseVariant = buildVariant(situation, {});
  const baseResult = runSingleVariant(situation, baseVariant);
  const baseScore = baseResult.northStarAlignment.overallScore;

  const factors: SensitivityFactor[] = FACTOR_DEFS.map((def) => {
    const variedValue = def.varied(def.base);
    const varied = buildVariant(situation, {
      [def.field]: variedValue,
    });
    const result = runSingleVariant(situation, varied);
    const impact = result.northStarAlignment.overallScore - baseScore;

    return {
      name: def.name,
      variation: def.label(variedValue),
      baseValue: baseScore,
      variedValue: baseScore + impact,
      impact,
      impactLabel: impact > 0 ? "positive" : impact < 0 ? "negative" : "neutral",
    };
  });

  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    baseResult,
    factors,
    mostSensitive: factors[0] ?? null,
    leastSensitive: factors[factors.length - 1] ?? null,
    generatedAt: new Date().toISOString(),
  };
}
