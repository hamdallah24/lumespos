import type { RecommendationScore } from "./DecisionOutcome";

interface RecRecord {
  id: string;
  title: string;
  executive: string;
  accepted: boolean;
  executed: boolean;
  outcomeScore: number;
  impact: number;
  timestamp: number;
}

export class RecommendationEffectiveness {
  private records: RecRecord[] = [];
  private maxRecords = 500;

  record(id: string, title: string, executive: string, accepted: boolean, executed: boolean, outcomeScore: number, impact: number): void {
    this.records.push({ id, title, executive, accepted, executed, outcomeScore, impact, timestamp: Date.now() });
    if (this.records.length > this.maxRecords) this.records.shift();
  }

  getScore(id: string): RecommendationScore | null {
    const related = this.records.filter(r => r.id === id);
    if (related.length === 0) return null;
    const accepted = related.some(r => r.accepted);
    const executed = related.some(r => r.executed);
    const successRate = related.length > 0
      ? related.filter(r => r.outcomeScore >= 60).length / related.length
      : 0;
    const avgImpact = related.length > 0
      ? related.reduce((s, r) => s + r.impact, 0) / related.length
      : 0;
    return {
      recommendationId: id, title: related[0].title,
      executive: related[0].executive,
      accepted, executed,
      successRate: Math.round(successRate * 100) / 100,
      averageImpact: Math.round(avgImpact * 100) / 100,
      count: related.length,
    };
  }

  getRankedByEffectiveness(executive?: string): RecommendationScore[] {
    const groups = new Map<string, RecRecord[]>();
    for (const r of this.records) {
      if (executive && r.executive !== executive) continue;
      const existing = groups.get(r.id) ?? [];
      existing.push(r);
      groups.set(r.id, existing);
    }
    return Array.from(groups.entries())
      .map(([id, recs]) => {
        const accepted = recs.some(r => r.accepted);
        const executed = recs.some(r => r.executed);
        const successRate = recs.filter(r => r.outcomeScore >= 60).length / recs.length;
        const avgImpact = recs.reduce((s, r) => s + r.impact, 0) / recs.length;
        return {
          recommendationId: id, title: recs[0].title,
          executive: recs[0].executive,
          accepted, executed,
          successRate: Math.round(successRate * 100) / 100,
          averageImpact: Math.round(avgImpact * 100) / 100,
          count: recs.length,
        };
      })
      .sort((a, b) => b.successRate - a.successRate);
  }

  getStats(executive: string): { total: number; accepted: number; executed: number; avgSuccessRate: number; avgImpact: number } {
    const items = this.records.filter(r => r.executive === executive);
    const total = items.length;
    const accepted = items.filter(r => r.accepted).length;
    const executed = items.filter(r => r.executed).length;
    const avgSuccess = total > 0 ? items.filter(r => r.outcomeScore >= 60).length / total : 0;
    const avgImpact = total > 0 ? items.reduce((s, r) => s + r.impact, 0) / total : 0;
    return {
      total, accepted, executed,
      avgSuccessRate: Math.round(avgSuccess * 100) / 100,
      avgImpact: Math.round(avgImpact * 100) / 100,
    };
  }

  count(): number { return this.records.length; }
}
