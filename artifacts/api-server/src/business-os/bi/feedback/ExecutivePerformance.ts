import type { ExecutivePerformanceMetrics, OutcomeStatus } from "./DecisionOutcome";
import { DecisionOutcomeTracker } from "./DecisionOutcomeTracker";
import { ForecastAccuracy } from "./ForecastAccuracy";
import { StrategyEvaluator } from "./StrategyEvaluator";

export class ExecutivePerformance {
  private tracker: DecisionOutcomeTracker;
  private forecastAcc: ForecastAccuracy;
  private strategyEval: StrategyEvaluator;

  constructor(tracker: DecisionOutcomeTracker, forecastAcc: ForecastAccuracy, strategyEval: StrategyEvaluator) {
    this.tracker = tracker;
    this.forecastAcc = forecastAcc;
    this.strategyEval = strategyEval;
  }

  calculate(executive: string, calibratedConfidence: number = 0): ExecutivePerformanceMetrics {
    const outcomes = this.tracker.getByExecutive(executive);
    const totalDecisions = outcomes.length;
    const successful = outcomes.filter(o => o.status === "SUCCESS").length;
    const failed = outcomes.filter(o => o.status === "FAILED").length;
    const partial = outcomes.filter(o => o.status === "PARTIAL").length;
    const successRate = totalDecisions > 0 ? successful / totalDecisions : 0;
    const avgConfidence = totalDecisions > 0
      ? outcomes.reduce((s, o) => s + (o.score / 100), 0) / totalDecisions
      : 0;
    const avgDev = totalDecisions > 0
      ? outcomes.reduce((s, o) => s + o.deviation, 0) / totalDecisions
      : 0;

    const forecastAccVal = this.forecastAcc.getOverallAccuracy();
    const strategyStats = this.strategyEval.getStats(executive);

    const perfTrend = this.calcTrend(outcomes);

    return {
      executive,
      totalDecisions,
      successful, failed, partial,
      successRate: Math.round(successRate * 10000) / 100,
      avgConfidence: Math.round(avgConfidence * 10000) / 100,
      calibratedConfidence: Math.round(calibratedConfidence * 10000) / 100,
      forecastAccuracy: Math.round(forecastAccVal * 100) / 100,
      avgDeviation: Math.round(avgDev * 100) / 100,
      avgROI: strategyStats.avgSuccessRate,
      trend: perfTrend,
    };
  }

  calculateAll(calibrations: Map<string, number>): ExecutivePerformanceMetrics[] {
    const executives = ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"];
    return executives.map(exec => this.calculate(exec, calibrations.get(exec) ?? 0));
  }

  private calcTrend(outcomes: { executedAt: number; status: OutcomeStatus }[]): "improving" | "declining" | "stable" {
    if (outcomes.length < 10) return "stable";
    const half = Math.floor(outcomes.length / 2);
    const recent = outcomes.slice(0, half).filter(o => o.status === "SUCCESS").length / half;
    const older = outcomes.slice(half).filter(o => o.status === "SUCCESS").length / (outcomes.length - half);
    if (recent > older + 0.1) return "improving";
    if (recent < older - 0.1) return "declining";
    return "stable";
  }
}
