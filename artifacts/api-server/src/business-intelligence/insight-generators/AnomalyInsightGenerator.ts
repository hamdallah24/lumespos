import { registerInsightGenerator, buildInsight, metricStore } from "../core";

export function registerAnomalyInsightGenerator(): void {
  registerInsightGenerator("revenue_anomaly_drop", (_metrics, branchId) => {
    const revenueMetrics = metricStore.getByName("daily_revenue", branchId);
    if (revenueMetrics.length < 3) return null;

    const sorted = revenueMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const latest = sorted[sorted.length - 1];
    const previousDays = sorted.slice(-4, -1);
    const avg = previousDays.reduce((s, m) => s + m.value, 0) / previousDays.length;

    if (avg === 0) return null;
    const deviation = (latest.value - avg) / avg;

    if (Math.abs(deviation) < 0.2) return null;

    const severity = deviation < -0.3 ? "critical" : deviation < -0.2 ? "warning" : "info";

    return buildInsight({
      category: "anomaly",
      name: "revenue_anomaly_drop",
      description: `Revenue deviation from 3-day average: ${(deviation * 100).toFixed(1)}% (avg: ${avg.toFixed(0)}, today: ${latest.value.toFixed(0)})`,
      value: deviation,
      severity,
      sourceMetrics: [latest.id, ...previousDays.map(m => m.id)],
      domain: "sales",
      branchId,
    });
  });

  registerInsightGenerator("expense_anomaly", (_metrics, branchId) => {
    const expenseMetrics = metricStore.getByName("daily_expense", branchId);
    if (expenseMetrics.length < 3) return null;

    const sorted = expenseMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const latest = sorted[sorted.length - 1];
    const previousDays = sorted.slice(-4, -1);
    const avg = previousDays.reduce((s, m) => s + m.value, 0) / previousDays.length;

    if (avg === 0) return null;
    const ratio = latest.value / avg;

    if (ratio < 1.5) return null;

    const severity = ratio > 3 ? "critical" : ratio > 2 ? "warning" : "info";

    return buildInsight({
      category: "anomaly",
      name: "expense_anomaly_spike",
      description: `Expense spike: ${ratio.toFixed(1)}x daily average (today: ${latest.value.toFixed(0)}, avg: ${avg.toFixed(0)})`,
      value: ratio,
      severity,
      sourceMetrics: [latest.id, ...previousDays.map(m => m.id)],
      domain: "finance",
      branchId,
    });
  });
}
