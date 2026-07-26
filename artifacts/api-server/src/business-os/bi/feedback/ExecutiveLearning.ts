import type { ExecutiveLearningProfile } from "./DecisionOutcome";
import { DecisionOutcomeTracker } from "./DecisionOutcomeTracker";
import { ConfidenceCalibration } from "./ConfidenceCalibration";
import { StrategyEvaluator } from "./StrategyEvaluator";

export class ExecutiveLearning {
  private tracker: DecisionOutcomeTracker;
  private calibration: ConfidenceCalibration;
  private strategyEval: StrategyEvaluator;

  constructor(tracker: DecisionOutcomeTracker, calibration: ConfidenceCalibration, strategyEval: StrategyEvaluator) {
    this.tracker = tracker;
    this.calibration = calibration;
    this.strategyEval = strategyEval;
  }

  generateProfile(executive: string): ExecutiveLearningProfile {
    const outcomes = this.tracker.getByExecutive(executive);
    const totalDecisions = outcomes.length;

    const actionGroups = new Map<string, { total: number; successes: number }>();
    for (const o of outcomes) {
      const existing = actionGroups.get(o.action) ?? { total: 0, successes: 0 };
      existing.total++;
      if (o.status === "SUCCESS") existing.successes++;
      actionGroups.set(o.action, existing);
    }

    const strengths: { area: string; score: number }[] = [];
    const weaknesses: { area: string; score: number }[] = [];
    for (const [action, data] of actionGroups) {
      const score = data.total > 0 ? data.successes / data.total : 0;
      if (score >= 0.7 && data.total >= 2) strengths.push({ area: action, score: Math.round(score * 100) });
      if (score < 0.4) weaknesses.push({ area: action, score: Math.round(score * 100) });
    }

    const failurePatterns = this.buildFailurePatterns(outcomes);
    const successPatterns = this.buildSuccessPatterns(outcomes);
    const calibrations = this.calibration.getAverageCalibration(executive);
    const strategyStats = this.strategyEval.getStats(executive);

    const improvementAreas = [
      ...weaknesses.map(w => `Tingkatkan ${w.area} (skor: ${w.score}%)`),
      totalDecisions < 10 ? "Perlu lebih banyak pengambilan keputusan" : null,
      calibrations.avgOriginal > calibrations.avgCalibrated ? "Kalibrasi confidence lebih akurat" : null,
      strategyStats.avgSuccessRate < 0.5 ? "Pilih strategi dengan track record lebih baik" : null,
    ].filter((x): x is string => x !== null);

    const overallScore = totalDecisions > 0
      ? Math.round(
          (outcomes.filter(o => o.status === "SUCCESS" || o.status === "PARTIAL").length / totalDecisions) * 50
          + Math.max(0, (1 - outcomes.reduce((s, o) => s + o.deviation, 0) / (totalDecisions || 1))) * 30
          + this.calibration.getMultiplier(executive) * 20
        )
      : 0;

    return {
      executive, totalDecisions, overallScore,
      strengths: strengths.sort((a, b) => b.score - a.score).slice(0, 5),
      weaknesses: weaknesses.sort((a, b) => a.score - b.score).slice(0, 3),
      failurePatterns: failurePatterns.slice(0, 5),
      successPatterns: successPatterns.slice(0, 5),
      improvementAreas,
    };
  }

  generateAllProfiles(): ExecutiveLearningProfile[] {
    return ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"]
      .map(exec => this.generateProfile(exec));
  }

  private buildFailurePatterns(outcomes: { action: string; status: string; deviation: number; reason: string }[]): { pattern: string; count: number; severity: string }[] {
    const patterns = new Map<string, { count: number; severity: string }>();
    for (const o of outcomes) {
      if (o.status !== "FAILED" && o.status !== "PARTIAL") continue;
      const key = o.action || "unknown";
      const existing = patterns.get(key) ?? { count: 0, severity: "low" };
      existing.count++;
      existing.severity = existing.count >= 5 ? "critical" : existing.count >= 3 ? "high" : "medium";
      patterns.set(key, existing);
    }
    return Array.from(patterns.entries()).map(([pattern, data]) => ({ pattern, count: data.count, severity: data.severity }));
  }

  private buildSuccessPatterns(outcomes: { action: string; status: string; score: number }[]): { pattern: string; count: number; avgConfidence: number }[] {
    const patterns = new Map<string, { count: number; totalConf: number }>();
    for (const o of outcomes) {
      if (o.status !== "SUCCESS") continue;
      const key = o.action || "unknown";
      const existing = patterns.get(key) ?? { count: 0, totalConf: 0 };
      existing.count++;
      existing.totalConf += o.score / 100;
      patterns.set(key, existing);
    }
    return Array.from(patterns.entries()).map(([pattern, data]) => ({
      pattern, count: data.count,
      avgConfidence: Math.round((data.totalConf / data.count) * 100) / 100,
    }));
  }
}
