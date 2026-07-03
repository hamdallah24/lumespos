// ECP-033.5: Runtime Scorecards — per-runtime KPI evaluation
// Frozen. Each runtime gets a scorecard with trends and recommendations.

import type { RuntimeScorecard } from "./learning-types";
import { learningStorage } from "./learning-storage";
import { confidenceCalibrator } from "./confidence-calibrator";

class RuntimeScorecardEngine {
  private _scorecards = new Map<string, RuntimeScorecard>();

  evaluate(runtime: string): RuntimeScorecard {
    const outcomes = learningStorage.getOutcomes(runtime, 50);
    const calibration = confidenceCalibrator.calibrate(runtime);

    const successRate = outcomes.length > 0
      ? Math.round(outcomes.filter(o => o.actualOutcome === "SUCCESS").length / outcomes.length * 100)
      : 100;

    const avgEvidence = outcomes.length > 0
      ? Math.round(outcomes.reduce((s, o) => s + o.evidenceCount, 0) / outcomes.length)
      : 0;

    const recs: string[] = [];
    if (calibration.overConfident > calibration.calibrated * 0.3) recs.push("Reduce confidence estimates — overconfident");
    if (avgEvidence < 3 && outcomes.length > 5) recs.push("Increase evidence gathering before decisions");
    if (successRate < 85 && outcomes.length > 3) recs.push("Review decision quality — below 85% threshold");

    const scorecard: RuntimeScorecard = {
      runtime,
      metrics: {
        decisionAccuracy: successRate,
        evidenceQuality: Math.min(100, avgEvidence * 25),
        calibrationScore: calibration.calibrationScore,
        successRate,
        totalDecisions: outcomes.length,
      },
      trends: {
        decisionAccuracy: this.computeTrend(runtime, "decisionAccuracy", successRate),
      },
      overallScore: Math.round((successRate + calibration.calibrationScore) / 2),
      recommendations: recs,
      lastUpdated: new Date().toISOString(),
    };

    this._scorecards.set(runtime, scorecard);
    return scorecard;
  }

  getScorecard(runtime: string): RuntimeScorecard | undefined {
    return this._scorecards.get(runtime);
  }

  evaluateAll(): RuntimeScorecard[] {
    const runtimes = new Set(learningStorage.getOutcomes().map(o => o.runtime));
    return [...runtimes].map(r => this.evaluate(r));
  }

  private computeTrend(_runtime: string, _metric: string, _current: number): "stable" { return "stable"; }
}

export const runtimeScorecards = new RuntimeScorecardEngine();
