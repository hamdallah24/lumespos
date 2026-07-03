// ECP-033.5: Learning Storage — persistent learning data
// Frozen. Stores outcomes, calibrations, patterns in memory.

import type { DecisionOutcome, ConfidenceCalibration, LearningPattern, ImprovementProposal } from "./learning-types";

class LearningStorage {
  private _outcomes: DecisionOutcome[] = [];
  private _calibrations = new Map<string, ConfidenceCalibration>();
  private _patterns: LearningPattern[] = [];
  private _proposals: ImprovementProposal[] = [];

  storeOutcome(outcome: DecisionOutcome): void {
    this._outcomes.push(outcome);
    if (this._outcomes.length > 500) this._outcomes.splice(0, 100);
  }

  getOutcomes(runtime?: string, limit = 50): DecisionOutcome[] {
    let filtered = this._outcomes;
    if (runtime) filtered = filtered.filter(o => o.runtime === runtime);
    return filtered.slice(-limit).reverse();
  }

  storeCalibration(calibration: ConfidenceCalibration): void {
    this._calibrations.set(calibration.runtime, calibration);
  }

  getCalibration(runtime: string): ConfidenceCalibration | undefined {
    return this._calibrations.get(runtime);
  }

  getAllCalibrations(): ConfidenceCalibration[] {
    return [...this._calibrations.values()];
  }

  storePattern(pattern: LearningPattern): void {
    const existing = this._patterns.find(p => p.description === pattern.description);
    if (existing) { existing.occurrences += pattern.occurrences; existing.lastDetected = pattern.lastDetected; return; }
    this._patterns.push(pattern);
    if (this._patterns.length > 100) this._patterns.splice(0, 20);
  }

  getPatterns(): LearningPattern[] { return this._patterns; }

  storeProposal(proposal: ImprovementProposal): void {
    this._proposals.push(proposal);
  }

  getProposals(): ImprovementProposal[] { return this._proposals; }
  getPendingProposals(): ImprovementProposal[] { return this._proposals.filter(p => p.status === "pending"); }
}

export const learningStorage = new LearningStorage();
