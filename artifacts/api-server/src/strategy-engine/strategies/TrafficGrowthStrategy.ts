import type { StrategicObjective } from "../core/types";

export function createTrafficGrowthStrategy(base: Partial<StrategicObjective>): StrategicObjective {
  return {
    ...base as StrategicObjective,
    title: "Strategi Pertumbuhan Trafik",
    description: "Tingkatkan lalu lintas pelanggan dengan promosi dan perluasan jam operasional",
    direction: "growth",
    kpiTargets: [
      { metric: "daily_revenue", currentValue: 0, targetValue: 0, unit: "rupiah", deadline: new Date(Date.now() + 30 * 86400000) },
      { metric: "order_count", currentValue: 0, targetValue: 0, unit: "count", deadline: new Date(Date.now() + 30 * 86400000) },
    ],
    northStarAlignment: { overallScore: 0, dimensions: [], summary: "Menunggu evaluasi" },
    confidence: 70,
    status: "draft",
    createdAt: new Date(),
  };
}
