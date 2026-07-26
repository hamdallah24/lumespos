import type { DecisionOutcome, OutcomeStatus } from "./DecisionOutcome";
import { DecisionOutcomeTracker } from "./DecisionOutcomeTracker";

export class OutcomeRecorder {
  private tracker: DecisionOutcomeTracker;

  constructor(tracker: DecisionOutcomeTracker) {
    this.tracker = tracker;
  }

  record(
    decision: { decisionId: string; executive: string; action: string; reasoning: string; confidence: number; parameters: Record<string, any> },
    execution: { executionId: string; success: boolean; message: string; durationMs: number },
    erpResult?: { before: Record<string, number>; after: Record<string, number> },
    businessResult?: { actualValue: number; expectedValue: number },
  ): DecisionOutcome {
    const kpiImpact: { kpiId: string; before: number; after: number; change: number }[] = [];
    if (erpResult) {
      for (const key of Object.keys(erpResult.before)) {
        const before = erpResult.before[key];
        const after = erpResult.after[key];
        kpiImpact.push({ kpiId: key, before, after, change: after - before });
      }
    }

    const expectedValue = businessResult?.expectedValue ?? 100;
    const actualValue = businessResult?.actualValue ?? (execution.success ? 100 : 0);
    const deviation = Math.abs(expectedValue - actualValue) / (expectedValue || 1);

    const objective = decision.reasoning.slice(0, 100);
    const actualResult = execution.success ? execution.message : `Gagal: ${execution.message}`;
    const expectedResult = decision.reasoning.slice(0, 100);

    return this.tracker.track(
      decision.decisionId, execution.executionId, decision.executive,
      decision.action, objective, "PENDING",
      execution.success ? 80 : 20, expectedResult, actualResult,
      deviation, execution.message, kpiImpact,
    );
  }

  evaluateAndUpdate(outcome: DecisionOutcome, evaluator: { evaluate: (outcome: DecisionOutcome) => { status: OutcomeStatus; score: number; reason: string } }): DecisionOutcome {
    const result = evaluator.evaluate(outcome);
    outcome.status = result.status;
    outcome.score = result.score;
    outcome.reason = result.reason;
    outcome.evaluatedAt = Date.now();
    return outcome;
  }
}
