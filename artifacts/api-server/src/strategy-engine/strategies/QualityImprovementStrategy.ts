import type { StrategicObjective } from "../core/types";

export function createQualityImprovementStrategy(base: Partial<StrategicObjective>): StrategicObjective {
  return {
    ...base as StrategicObjective,
    title: "Strategi Peningkatan Kualitas",
    description: "Tingkatkan standar kualitas produk, kurangi komplain dan waste produksi",
    direction: "quality",
    kpiTargets: [
      { metric: "yield", currentValue: 0, targetValue: 0, unit: "percent", deadline: new Date(Date.now() + 30 * 86400000) },
      { metric: "stock_accuracy", currentValue: 0, targetValue: 0, unit: "percent", deadline: new Date(Date.now() + 14 * 86400000) },
    ],
    northStarAlignment: { overallScore: 0, dimensions: [], summary: "Menunggu evaluasi" },
    confidence: 70,
    status: "draft",
    createdAt: new Date(),
  };
}
