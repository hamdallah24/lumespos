import type { StrategicObjective } from "../strategy-engine/core/types";
import type { ForecastKPI, ForecastResult } from "./types";

export function forecastOutcomes(objective: StrategicObjective): ForecastResult {
  const baseConfidence = objective.confidence / 100;
  const kpis: ForecastKPI[] = objective.kpiTargets.map((kpi) => {
    const gap = kpi.targetValue - kpi.currentValue;
    const probability = clamp(baseConfidence * (gap > 0 ? 0.9 : 1.1), 0.1, 0.95);
    const projectedValue = kpi.currentValue + gap * baseConfidence;
    const halfWidth = Math.abs(gap) * (1 - baseConfidence) * 0.5;

    return {
      metric: kpi.metric,
      currentValue: kpi.currentValue,
      targetValue: kpi.targetValue,
      unit: kpi.unit,
      probability: Math.round(probability * 100),
      projectedValue: Math.round(projectedValue * 100) / 100,
      confidenceInterval: {
        low: Math.round((projectedValue - halfWidth) * 100) / 100,
        high: Math.round((projectedValue + halfWidth) * 100) / 100,
      },
    };
  });

  const avgProbability = kpis.reduce((s, k) => s + k.probability, 0) / kpis.length;
  const overallScore = objective.northStarAlignment.overallScore;
  const summary = overallScore >= 70
    ? `Proyeksi optimis: ${kpis.length} KPI dengan probabilitas rata-rata ${avgProbability.toFixed(0)}%`
    : `Proyeksi hati-hati: skor alignment ${overallScore} — probabilitas rata-rata ${avgProbability.toFixed(0)}%`;

  return {
    kpis,
    overallConfidence: Math.round(avgProbability),
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
