import type { Dimension, KPIValue } from "../types";

export class HealthScore {
  dimScores: Map<Dimension, number> = new Map();

  setScore(dimension: Dimension, score: number): void {
    this.dimScores.set(dimension, Math.max(0, Math.min(100, score)));
  }

  setScores(scores: Record<Dimension, number>): void {
    for (const [dim, score] of Object.entries(scores)) {
      this.setScore(dim as Dimension, score);
    }
  }

  calculateOverall(weights?: Record<string, number>): number {
    const w: Record<string, number> = weights ?? {};
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [dim, score] of this.dimScores) {
      const weight = w[dim] ?? 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  getStatus(dimension: Dimension): "healthy" | "warning" | "critical" {
    const score = this.dimScores.get(dimension);
    return this.getStatusForScore(score ?? 0);
  }

  getStatusForScore(score: number): "healthy" | "warning" | "critical" {
    if (score >= 80) return "healthy";
    if (score >= 50) return "warning";
    return "critical";
  }

  calculateFromKPIs(kpiValues: KPIValue[]): void {
    const grouped = new Map<Dimension, number[]>();
    for (const kpi of kpiValues) {
      const arr = grouped.get(kpi.dimension) ?? [];
      arr.push(kpi.value);
      grouped.set(kpi.dimension, arr);
    }
    for (const [dim, values] of grouped) {
      const normalized = values.map((v) => Math.max(0, Math.min(100, v)));
      const avg = normalized.reduce((s, v) => s + v, 0) / normalized.length;
      this.dimScores.set(dim, avg);
    }
  }
}
