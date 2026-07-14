import type { NorthStarAlignment, NorthStarDimension, StrategicDirection } from "./types";
import { NorthStarConfiguration } from "../../north-star/NorthStarConfiguration";

const DIMENSION_EVALUATORS: Record<string, (direction: StrategicDirection) => { score: number; rationale: string }> = {
  "NS-001": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 80, optimization: 50, cost_reduction: 30, quality: 40, risk_mitigation: 20,
    };
    return { score: scores[d] ?? 50, rationale: `Revenue impact: ${d.replace(/_/g, " ")}` };
  },
  "NS-002": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 50, optimization: 80, cost_reduction: 70, quality: 40, risk_mitigation: 50,
    };
    return { score: scores[d] ?? 50, rationale: `Margin impact: ${d.replace(/_/g, " ")}` };
  },
  "NS-003": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 40, optimization: 70, cost_reduction: 60, quality: 50, risk_mitigation: 80,
    };
    return { score: scores[d] ?? 50, rationale: `Stock coverage: ${d.replace(/_/g, " ")}` };
  },
  "NS-004": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 50, optimization: 70, cost_reduction: 50, quality: 90, risk_mitigation: 60,
    };
    return { score: scores[d] ?? 50, rationale: `Yield efficiency: ${d.replace(/_/g, " ")}` };
  },
  "NS-005": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 30, optimization: 60, cost_reduction: 70, quality: 50, risk_mitigation: 80,
    };
    return { score: scores[d] ?? 50, rationale: `Cash control: ${d.replace(/_/g, " ")}` };
  },
  "NS-006": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 40, optimization: 70, cost_reduction: 90, quality: 30, risk_mitigation: 60,
    };
    return { score: scores[d] ?? 50, rationale: `Expense ratio: ${d.replace(/_/g, " ")}` };
  },
  "NS-007": (d) => {
    const scores: Record<StrategicDirection, number> = {
      growth: 50, optimization: 60, cost_reduction: 40, quality: 90, risk_mitigation: 60,
    };
    return { score: scores[d] ?? 50, rationale: `Customer satisfaction: ${d.replace(/_/g, " ")}` };
  },
};

export function alignWithNorthStar(direction: StrategicDirection): NorthStarAlignment {
  const config = NorthStarConfiguration.get();
  const totalWeight = config.objectives.reduce((s, o) => s + o.weight, 0) || 1;

  const dimensions: NorthStarDimension[] = config.objectives.map((objective) => {
    const evaluator = DIMENSION_EVALUATORS[objective.id];
    const result = evaluator ? evaluator(direction) : { score: 50, rationale: `Generic alignment for ${objective.name}` };
    return {
      name: objective.name,
      weight: objective.weight / totalWeight,
      score: result.score,
      rationale: result.rationale,
    };
  });

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    overallScore,
    dimensions,
    summary: `North Star alignment score: ${overallScore}/100 — ${overallScore >= 70 ? "highly aligned" : overallScore >= 50 ? "moderately aligned" : "poorly aligned"}`,
  };
}
