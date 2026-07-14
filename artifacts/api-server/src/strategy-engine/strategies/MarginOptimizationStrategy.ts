import type { StrategicObjective } from "../core/types";

export function createMarginOptimizationStrategy(base: Partial<StrategicObjective>): StrategicObjective {
  return {
    ...base as StrategicObjective,
    title: "Strategi Optimasi Margin",
    description: "Tingkatkan margin keuntungan melalui efisiensi bahan baku dan harga jual",
    direction: "optimization",
    kpiTargets: [
      { metric: "gross_margin", currentValue: 0, targetValue: 0, unit: "percent", deadline: new Date(Date.now() + 30 * 86400000) },
      { metric: "expense_ratio", currentValue: 0, targetValue: 0, unit: "ratio", deadline: new Date(Date.now() + 30 * 86400000) },
    ],
    northStarAlignment: { overallScore: 0, dimensions: [], summary: "Menunggu evaluasi" },
    confidence: 75,
    status: "draft",
    createdAt: new Date(),
  };
}
