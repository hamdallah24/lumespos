import type { StrategyResult } from "./DecisionOutcome";
import { OutcomeStatus } from "./DecisionOutcome";

interface StrategyRecord {
  name: string;
  executive: string;
  action: string;
  outcome: OutcomeStatus;
  score: number;
  roi: number;
  timestamp: number;
}

const RISK_BY_OUTCOME: Record<string, "low" | "medium" | "high"> = {
  SUCCESS: "low", PARTIAL: "medium", FAILED: "high", PENDING: "medium",
};

export class StrategyEvaluator {
  private records: StrategyRecord[] = [];
  private maxRecords = 500;

  record(name: string, executive: string, action: string, outcome: OutcomeStatus, score: number, roi: number): void {
    this.records.push({ name, executive, action, outcome, score, roi, timestamp: Date.now() });
    if (this.records.length > this.maxRecords) this.records.shift();
  }

  evaluate(name: string): StrategyResult | null {
    const related = this.records.filter(r => r.name === name);
    if (related.length === 0) return null;
    const usage = related.length;
    const successes = related.filter(r => r.outcome === "SUCCESS").length;
    const failures = related.filter(r => r.outcome === "FAILED").length;
    const successRate = usage > 0 ? successes / usage : 0;
    const avgRoi = usage > 0 ? related.reduce((s, r) => s + r.roi, 0) / usage : 0;
    const risk = failures / usage > 0.3 ? "high" : failures / usage > 0.1 ? "medium" : "low";

    return {
      strategy: name, executive: related[0].executive,
      usage, successes, failures,
      successRate: Math.round(successRate * 100) / 100,
      roi: Math.round(avgRoi * 100) / 100,
      risk,
      lastUsed: Math.max(...related.map(r => r.timestamp)),
    };
  }

  evaluateAll(executive?: string): StrategyResult[] {
    const names = [...new Set(this.records.map(r => r.name))];
    return names
      .map(n => this.evaluate(n))
      .filter((s): s is StrategyResult => s !== null)
      .filter(s => !executive || s.executive === executive)
      .sort((a, b) => b.successRate - a.successRate);
  }

  getBestStrategies(executive: string, limit: number = 5): StrategyResult[] {
    return this.evaluateAll(executive).slice(0, limit);
  }

  getWorstStrategies(executive: string, limit: number = 5): StrategyResult[] {
    return this.evaluateAll(executive).sort((a, b) => a.successRate - b.successRate).slice(0, limit);
  }

  getTopROI(executive?: string, limit: number = 5): StrategyResult[] {
    return this.evaluateAll(executive).sort((a, b) => b.roi - a.roi).slice(0, limit);
  }

  getStats(executive: string): { total: number; avgSuccessRate: number; bestStrategy: string; worstStrategy: string } {
    const all = this.evaluateAll(executive);
    const avgRate = all.length > 0 ? all.reduce((s, r) => s + r.successRate, 0) / all.length : 0;
    const best = all.sort((a, b) => b.successRate - a.successRate)[0];
    const worst = all.sort((a, b) => a.successRate - b.successRate)[0];
    return {
      total: all.length,
      avgSuccessRate: Math.round(avgRate * 100) / 100,
      bestStrategy: best?.strategy ?? "-",
      worstStrategy: worst?.strategy ?? "-",
    };
  }

  count(): number { return this.records.length; }
}
