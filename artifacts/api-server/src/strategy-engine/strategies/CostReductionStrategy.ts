import type { StrategicObjective } from "../core/types";

export function createCostReductionStrategy(base: Partial<StrategicObjective>): StrategicObjective {
  return {
    ...base as StrategicObjective,
    title: "Strategi Efisiensi Biaya",
    description: "Identifikasi dan eliminasi pengeluaran tidak perlu, negosiasi ulang kontrak supplier",
    direction: "cost_reduction",
    kpiTargets: [
      { metric: "daily_expense", currentValue: 0, targetValue: 0, unit: "rupiah", deadline: new Date(Date.now() + 14 * 86400000) },
      { metric: "expense_ratio", currentValue: 0, targetValue: 0, unit: "ratio", deadline: new Date(Date.now() + 30 * 86400000) },
    ],
    northStarAlignment: { overallScore: 0, dimensions: [], summary: "Menunggu evaluasi" },
    confidence: 65,
    status: "draft",
    createdAt: new Date(),
  };
}
