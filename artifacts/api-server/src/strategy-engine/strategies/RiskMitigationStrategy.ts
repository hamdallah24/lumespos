import type { StrategicObjective } from "../core/types";

export function createRiskMitigationStrategy(base: Partial<StrategicObjective>): StrategicObjective {
  return {
    ...base as StrategicObjective,
    title: "Strategi Mitigasi Risiko",
    description: "Antisipasi gangguan operasional dengan SOP darurat dan stok pengaman",
    direction: "risk_mitigation",
    kpiTargets: [
      { metric: "stock_coverage", currentValue: 0, targetValue: 0, unit: "days", deadline: new Date(Date.now() + 7 * 86400000) },
      { metric: "cash_accuracy", currentValue: 0, targetValue: 0, unit: "percent", deadline: new Date(Date.now() + 14 * 86400000) },
    ],
    northStarAlignment: { overallScore: 0, dimensions: [], summary: "Menunggu evaluasi" },
    confidence: 80,
    status: "draft",
    createdAt: new Date(),
  };
}
