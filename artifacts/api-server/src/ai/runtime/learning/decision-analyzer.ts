// ECP-033.5: Decision Analyzer — evaluates decision outcomes
// Frozen. Compares predicted confidence with actual results.

import type { DecisionOutcome } from "./learning-types";
import { learningStorage } from "./learning-storage";

class DecisionAnalyzer {
  evaluate(
    decisionId: string, runtime: string, decision: string,
    confidence: number, actualOutcome: DecisionOutcome["actualOutcome"],
    evidenceCount = 0, rootCause = "",
  ): DecisionOutcome {
    const outcomeScore = actualOutcome === "SUCCESS" ? 100 : actualOutcome === "PARTIAL" ? 50 : 0;
    const predictionError = Math.abs(confidence - outcomeScore);

    const outcome: DecisionOutcome = {
      decisionId, runtime, decision, confidence, actualOutcome,
      predictionError, rootCause: rootCause || "No root cause identified",
      timestamp: new Date().toISOString(), evidenceCount,
      learningApplied: false,
    };

    learningStorage.storeOutcome(outcome);
    return outcome;
  }

  /** Analyze all outcomes for a runtime */
  analyze(runtime: string): { total: number; successRate: number; avgPredictionError: number } {
    const outcomes = learningStorage.getOutcomes(runtime);
    if (outcomes.length === 0) return { total: 0, successRate: 100, avgPredictionError: 0 };

    const successes = outcomes.filter(o => o.actualOutcome === "SUCCESS").length;
    const avgError = Math.round(outcomes.reduce((s, o) => s + o.predictionError, 0) / outcomes.length);

    return { total: outcomes.length, successRate: Math.round((successes / outcomes.length) * 100), avgPredictionError: avgError };
  }
}

export const decisionAnalyzer = new DecisionAnalyzer();
