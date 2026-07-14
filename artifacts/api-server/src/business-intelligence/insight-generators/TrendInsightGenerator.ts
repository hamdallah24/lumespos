import { registerInsightGenerator, buildInsight, metricStore } from "../core";

export function registerTrendInsightGenerator(): void {
  registerInsightGenerator("revenue_trend_7d", (_metrics, branchId) => {
    const revenueMetrics = metricStore.getByName("daily_revenue", branchId);
    if (revenueMetrics.length < 2) return null;

    const sorted = revenueMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const recent = sorted.slice(-7);
    const oldest = recent[0].value;
    const newest = recent[recent.length - 1].value;
    const trend = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;

    return buildInsight({
      category: "trend",
      name: "revenue_trend_7d",
      description: `7-day revenue trend: ${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`,
      value: trend,
      severity: trend < -20 ? "critical" : trend < -5 ? "warning" : "info",
      sourceMetrics: recent.map(m => m.id),
      domain: "sales",
      branchId,
    });
  });

  registerInsightGenerator("order_trend_7d", (_metrics, branchId) => {
    const orderMetrics = metricStore.getByName("daily_order_count", branchId);
    if (orderMetrics.length < 2) return null;

    const sorted = orderMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const recent = sorted.slice(-7);
    const oldest = recent[0].value;
    const newest = recent[recent.length - 1].value;
    const trend = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;

    return buildInsight({
      category: "trend",
      name: "order_trend_7d",
      description: `7-day order volume trend: ${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`,
      value: trend,
      severity: "info",
      sourceMetrics: recent.map(m => m.id),
      domain: "sales",
      branchId,
    });
  });
}
