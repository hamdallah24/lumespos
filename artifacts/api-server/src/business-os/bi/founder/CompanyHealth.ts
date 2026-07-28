import type { HealthScoreResult, Dimension, Trend } from "../types";

export class CompanyHealth {
  getSummary(health: HealthScoreResult): { level: "excellent" | "good" | "fair" | "critical"; color: string; message: string } {
    const s = health.overall;
    if (s >= 85) return { level: "excellent", color: "green", message: "Company is performing excellently across all dimensions." };
    if (s >= 70) return { level: "good", color: "blue", message: "Company is in good shape with minor areas for improvement." };
    if (s >= 50) return { level: "fair", color: "yellow", message: "Company is stable but several dimensions need attention." };
    return { level: "critical", color: "red", message: "Company health is critical. Immediate action required." };
  }

  getTrendSummary(dimensions: { dimension: Dimension; score: number; status: "healthy" | "warning" | "critical"; trend: Trend }[]): string {
    const up = dimensions.filter((d) => d.trend === "up").length;
    const down = dimensions.filter((d) => d.trend === "down").length;
    const parts: string[] = [];
    if (up > 0) parts.push(`${up} dimension(s) improving`);
    if (down > 0) parts.push(`${down} dimension(s) declining`);
    const warnings = dimensions.filter((d) => d.status === "warning").length;
    const critical = dimensions.filter((d) => d.status === "critical").length;
    if (warnings > 0) parts.push(`${warnings} in warning`);
    if (critical > 0) parts.push(`${critical} critical`);
    return parts.length > 0 ? parts.join(", ") : "All dimensions stable";
  }

  getActionRequired(health: HealthScoreResult): string[] {
    const actions: string[] = [];
    for (const d of health.dimensions) {
      if (d.status === "critical") {
        actions.push(`Immediate intervention needed for ${d.dimension} (score: ${d.score.toFixed(1)})`);
      }
    }
    for (const d of health.dimensions) {
      if (d.status === "warning") {
        actions.push(`Monitor and improve ${d.dimension} (score: ${d.score.toFixed(1)})`);
      }
    }
    for (const r of health.topRisks) {
      actions.push(`Risk: ${r.risk}`);
    }
    return actions;
  }
}
