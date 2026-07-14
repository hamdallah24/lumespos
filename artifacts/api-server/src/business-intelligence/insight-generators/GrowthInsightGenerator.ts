import { registerInsightGenerator, buildInsight, metricStore } from "../core";

export function registerGrowthInsightGenerator(): void {
  registerInsightGenerator("revenue_growth", (_metrics, branchId) => {
    const current = metricStore.getLatest("daily_revenue", branchId);
    if (!current) return null;

    const revenueMetrics = metricStore.getByName("daily_revenue", branchId);
    if (revenueMetrics.length < 2) return null;

    const sorted = revenueMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const previous = sorted[sorted.length - 2];

    const growth = previous.value > 0
      ? ((current.value - previous.value) / previous.value) * 100
      : 0;

    const severity = growth < -30 ? "critical" : growth < -10 ? "warning" : "info";

    return buildInsight({
      category: "growth",
      name: "revenue_daily_growth",
      description: `Revenue growth vs previous day: ${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`,
      value: growth,
      severity,
      sourceMetrics: [current.id, previous.id],
      domain: "sales",
      branchId,
    });
  });

  registerInsightGenerator("order_volume_growth", (_metrics, branchId) => {
    const current = metricStore.getLatest("daily_order_count", branchId);
    if (!current) return null;

    const orderMetrics = metricStore.getByName("daily_order_count", branchId);
    if (orderMetrics.length < 2) return null;

    const sorted = orderMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const previous = sorted[sorted.length - 2];

    const growth = previous.value > 0
      ? ((current.value - previous.value) / previous.value) * 100
      : 0;

    return buildInsight({
      category: "growth",
      name: "order_volume_growth",
      description: `Order volume growth: ${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`,
      value: growth,
      severity: "info",
      sourceMetrics: [current.id, previous.id],
      domain: "sales",
      branchId,
    });
  });
}
