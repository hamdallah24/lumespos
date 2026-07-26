import type { DecisionOutcome, OutcomeStatus } from "./DecisionOutcome";

export class DecisionOutcomeTracker {
  private outcomes: Map<string, DecisionOutcome> = new Map();
  private maxEntries = 2000;

  track(
    decisionId: string, executionId: string, executive: string,
    action: string, objective: string, status: OutcomeStatus,
    score: number, expectedResult: string, actualResult: string,
    deviation: number, reason: string,
    kpiImpact: { kpiId: string; before: number; after: number; change: number }[] = [],
  ): DecisionOutcome {
    const outcome: DecisionOutcome = {
      decisionId, executionId, executive, objective, action,
      executedAt: Date.now(), evaluatedAt: Date.now(),
      status, score, expectedResult, actualResult, deviation,
      reason, kpiImpact,
    };
    this.outcomes.set(decisionId, outcome);
    if (this.outcomes.size > this.maxEntries) {
      const oldest = [...this.outcomes.keys()].sort()[0];
      if (oldest) this.outcomes.delete(oldest);
    }
    return outcome;
  }

  get(decisionId: string): DecisionOutcome | undefined {
    return this.outcomes.get(decisionId);
  }

  getByExecutive(executive: string): DecisionOutcome[] {
    return [...this.outcomes.values()].filter(o => o.executive === executive)
      .sort((a, b) => b.executedAt - a.executedAt);
  }

  getByStatus(status: OutcomeStatus): DecisionOutcome[] {
    return [...this.outcomes.values()].filter(o => o.status === status);
  }

  getRecent(limit: number = 20): DecisionOutcome[] {
    return [...this.outcomes.values()]
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, limit);
  }

  getAll(): DecisionOutcome[] {
    return [...this.outcomes.values()];
  }

  count(): number { return this.outcomes.size; }
  clear(): void { this.outcomes.clear(); }

  getSuccessRate(executive?: string): number {
    const items = executive ? this.getByExecutive(executive) : this.getAll();
    if (items.length === 0) return 0;
    const successful = items.filter(i => i.status === "SUCCESS" || i.status === "PARTIAL").length;
    return successful / items.length;
  }

  getStats(executive: string): { total: number; success: number; partial: number; failed: number; avgDeviation: number; avgScore: number } {
    const items = this.getByExecutive(executive);
    const success = items.filter(i => i.status === "SUCCESS").length;
    const partial = items.filter(i => i.status === "PARTIAL").length;
    const failed = items.filter(i => i.status === "FAILED").length;
    const total = items.length;
    const avgDev = total > 0 ? items.reduce((s, i) => s + i.deviation, 0) / total : 0;
    const avgScore = total > 0 ? items.reduce((s, i) => s + i.score, 0) / total : 0;
    return { total, success, partial, failed, avgDeviation: Math.round(avgDev * 100) / 100, avgScore: Math.round(avgScore) };
  }
}
