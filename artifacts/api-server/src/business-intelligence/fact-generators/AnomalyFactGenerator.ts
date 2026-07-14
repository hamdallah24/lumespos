import { registerFactGenerator, buildFact } from "../core";

export function registerAnomalyFactGenerator(): void {
  registerFactGenerator("anomaly_detected", (insights, branchId) => {
    const anomalies = insights.filter(i => i.category === "anomaly");
    if (anomalies.length === 0) return null;

    const highestSeverity = anomalies.reduce((max, i) => {
      const order = { critical: 3, warning: 2, info: 1 };
      return order[i.severity] > order[max.severity] ? i : max;
    }, anomalies[0]);

    const severity = highestSeverity.severity === "critical" ? "high"
      : highestSeverity.severity === "warning" ? "medium"
      : "low";

    return buildFact({
      category: "anomaly",
      name: "anomaly.detected",
      description: `Anomali terdeteksi: ${anomalies.map(a => a.description).join("; ")}`,
      severity,
      sourceInsights: anomalies.map(a => a.id),
      sourceMetrics: anomalies.flatMap(a => a.sourceMetrics),
      value: highestSeverity.value,
      domain: highestSeverity.domain,
      branchId,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
  });
}
