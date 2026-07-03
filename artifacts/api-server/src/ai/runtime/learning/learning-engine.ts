// ECP-033.5: Learning Engine — Organizational Learning System orchestrator
// Frozen. Coordinates all learning subsystems.
// Observes, measures, evaluates. NEVER decides.

import { decisionAnalyzer } from "./decision-analyzer";
import { confidenceCalibrator } from "./confidence-calibrator";
import { runtimeScorecards } from "./runtime-scorecards";
import { patternEngine } from "./pattern-engine";
import { proposalGenerator } from "./proposal-generator";
import { organizationHealth } from "./organization-health";
import { learningStorage } from "./learning-storage";
import type { DecisionOutcome } from "./learning-types";

class LearningEngine {
  /** Record a completed decision for analysis */
  recordDecision(
    decisionId: string, runtime: string, decision: string,
    confidence: number, actualOutcome: DecisionOutcome["actualOutcome"],
    evidenceCount = 0, rootCause = "",
  ): DecisionOutcome {
    return decisionAnalyzer.evaluate(decisionId, runtime, decision, confidence, actualOutcome, evidenceCount, rootCause);
  }

  /** Run a learning cycle — analyze all decisions, calibrate, detect patterns, generate proposals */
  cycle(): {
    decisionsAnalyzed: number;
    calibrationsUpdated: number;
    patternsDetected: number;
    proposalsGenerated: number;
    healthScore: number;
  } {
    const calibrations = confidenceCalibrator.calibrateAll();
    const scorecards = runtimeScorecards.evaluateAll();
    const patterns = patternEngine.detect();
    const proposals = proposalGenerator.generate();
    const health = organizationHealth.compute();

    return {
      decisionsAnalyzed: learningStorage.getOutcomes().length,
      calibrationsUpdated: calibrations.length,
      patternsDetected: patterns.length,
      proposalsGenerated: proposals.length,
      healthScore: health.overall,
    };
  }

  /** Get current organization health */
  getHealth() { return organizationHealth.compute(); }

  /** Get all pending improvement proposals */
  getPendingProposals() { return learningStorage.getPendingProposals(); }

  /** Get all runtime scorecards */
  getScorecards() { return runtimeScorecards.evaluateAll(); }
}

export const learningEngine = new LearningEngine();
