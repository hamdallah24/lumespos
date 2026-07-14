import { registerFactGenerator, buildFact } from "../core";

export function registerTrendFactGenerator(): void {
  registerFactGenerator("trend_significant", (insights, branchId) => {
    const trends = insights.filter(i => i.category === "trend");
    if (trends.length === 0) return null;

    const significant = trends.filter(t => t.severity === "critical" || t.severity === "warning");
    if (significant.length === 0) return null;

    const worst = significant.reduce((max, t) => {
      const order = { critical: 3, warning: 2, info: 1 };
      return order[t.severity] > order[max.severity] ? t : max;
    }, significant[0]);

    return buildFact({
      category: "trend",
      name: "trend.significant",
      description: `Trend signifikan: ${significant.map(t => t.description).join("; ")}`,
      severity: worst.severity === "critical" ? "high" : "medium",
      sourceInsights: significant.map(t => t.id),
      sourceMetrics: significant.flatMap(t => t.sourceMetrics),
      value: worst.value,
      domain: worst.domain,
      branchId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });
}
