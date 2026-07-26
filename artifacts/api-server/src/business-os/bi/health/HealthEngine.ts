import type { Dimension, HealthScoreResult, KPIValue, Trend } from "../types";
import { HealthDimension } from "./HealthDimension";
import { HealthScore } from "./HealthScore";

function determineTrend(dimension: Dimension, kpis: KPIValue[]): Trend {
  const relevant = kpis.filter((k) => k.dimension === dimension && k.previousValue !== undefined);
  if (relevant.length === 0) return "stable";
  const improving = relevant.filter((k) => k.value > (k.previousValue ?? 0)).length;
  const ratio = improving / relevant.length;
  if (ratio >= 0.6) return "up";
  if (ratio <= 0.3) return "down";
  return "stable";
}

export class HealthEngine {
  dimension: HealthDimension = new HealthDimension();
  score: HealthScore = new HealthScore();

  calculate(kpiValues: KPIValue[]): HealthScoreResult {
    this.score.calculateFromKPIs(kpiValues);

    const dimensions = this.dimension.dimensions.map((dim) => ({
      dimension: dim,
      score: this.score.dimScores.get(dim) ?? 0,
      status: this.score.getStatus(dim),
      trend: determineTrend(dim, kpiValues),
    }));

    const overall = this.score.calculateOverall(this.dimension.weights);

    return {
      overall,
      dimensions,
      topRisks: this.getRisks(kpiValues),
      topOpportunities: this.getOpportunities(kpiValues),
      timestamp: new Date().toISOString(),
    };
  }

  getRisks(kpiValues: KPIValue[]): { dimension: Dimension; risk: string; severity: "low" | "medium" | "high" | "critical" }[] {
    const risks: { dimension: Dimension; risk: string; severity: "low" | "medium" | "high" | "critical" }[] = [];
    for (const [dim, score] of this.score.dimScores) {
      if (score < 50) {
        risks.push({
          dimension: dim,
          risk: `${dim} dimension score is critically low (${score.toFixed(1)})`,
          severity: score < 30 ? "critical" : "high",
        });
      }
    }
    return risks.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  getOpportunities(kpiValues: KPIValue[]): { dimension: Dimension; opportunity: string; impact: string }[] {
    const opportunities: { dimension: Dimension; opportunity: string; impact: string }[] = [];
    for (const [dim, score] of this.score.dimScores) {
      const relevant = kpiValues.filter((k) => k.dimension === dim && k.previousValue !== undefined);
      const improving = relevant.filter((k) => k.value > (k.previousValue ?? 0));
      if (improving.length > 0 && score < 80) {
        const avgGain = improving.reduce((s, k) => s + (k.value - (k.previousValue ?? 0)), 0) / improving.length;
        opportunities.push({
          dimension: dim,
          opportunity: `${dim} is trending upward`,
          impact: `Average improvement of ${avgGain.toFixed(1)} per KPI`,
        });
      }
    }
    return opportunities.sort((a, b) => b.impact.length - a.impact.length);
  }

  format(result: HealthScoreResult): string {
    const lines: string[] = [
      `╔══════════════════════════════════════╗`,
      `║        HEALTH SCORE REPORT           ║`,
      `╠══════════════════════════════════════╣`,
      `║ Overall: ${result.overall.toFixed(1)}/100${" ".repeat(17)}║`,
      `╠══════════════════════════════════════╣`,
    ];
    for (const d of result.dimensions) {
      const label = `${d.dimension}:`.padEnd(14);
      const statusIcon = d.status === "healthy" ? "✓" : d.status === "warning" ? "!" : "✗";
      lines.push(`║ ${label}${d.score.toFixed(1)} [${statusIcon} ${d.status}]${" ".repeat(9)}║`);
    }
    lines.push(`╠══════════════════════════════════════╣`);
    lines.push(`║ Risks:${" ".repeat(37)}║`);
    for (const r of result.topRisks.slice(0, 3)) {
      lines.push(`║  - ${r.risk.slice(0, 36)}${" ".repeat(36 - Math.min(r.risk.length, 36))}║`);
    }
    lines.push(`╠══════════════════════════════════════╣`);
    lines.push(`║ Opportunities:${" ".repeat(29)}║`);
    for (const o of result.topOpportunities.slice(0, 3)) {
      lines.push(`║  - ${o.opportunity.slice(0, 34)}${" ".repeat(34 - Math.min(o.opportunity.length, 34))}║`);
    }
    lines.push(`╚══════════════════════════════════════╝`);
    return lines.join("\n");
  }
}
