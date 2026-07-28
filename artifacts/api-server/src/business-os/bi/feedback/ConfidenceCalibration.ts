import type { ConfidenceCalibrationEntry, OutcomeStatus } from "./DecisionOutcome";
import { DecisionOutcomeTracker } from "./DecisionOutcomeTracker";

export class ConfidenceCalibration {
  private calibrations: Map<string, ConfidenceCalibrationEntry[]> = new Map();
  private currentMultiplier = new Map<string, number>();

  calibrate(decisionId: string, executive: string, originalConfidence: number, outcome: OutcomeStatus): number {
    const penalty = outcome === "SUCCESS" ? 0 : outcome === "PARTIAL" ? 0.1 : 0.3;
    const boost = outcome === "SUCCESS" ? 0.05 : 0;

    const current = this.currentMultiplier.get(executive) ?? 1.0;
    const adjusted = Math.max(0.5, Math.min(1.0, current - penalty + boost));
    this.currentMultiplier.set(executive, adjusted);

    const calibratedConfidence = Math.round(originalConfidence * adjusted * 100) / 100;

    const entry: ConfidenceCalibrationEntry = {
      decisionId, executive, originalConfidence, outcome,
      calibratedConfidence: Math.min(1, Math.max(0, calibratedConfidence)),
      timestamp: Date.now(),
    };

    const existing = this.calibrations.get(executive) ?? [];
    existing.push(entry);
    if (existing.length > 200) existing.shift();
    this.calibrations.set(executive, existing);

    return entry.calibratedConfidence;
  }

  calibrateFromTracker(tracker: DecisionOutcomeTracker): void {
    const allOutcomes = tracker.getAll();
    for (const outcome of allOutcomes) {
      const confidence = outcome.score / 100;
      this.calibrate(outcome.decisionId, outcome.executive, confidence, outcome.status);
    }
  }

  getCalibratedConfidence(executive: string, originalConfidence: number): number {
    const multiplier = this.currentMultiplier.get(executive) ?? 1.0;
    return Math.min(1, Math.max(0, originalConfidence * multiplier));
  }

  getMultiplier(executive: string): number {
    return this.currentMultiplier.get(executive) ?? 1.0;
  }

  getHistory(executive: string): ConfidenceCalibrationEntry[] {
    return this.calibrations.get(executive) ?? [];
  }

  getAverageCalibration(executive: string): { avgOriginal: number; avgCalibrated: number; multiplier: number } {
    const history = this.getHistory(executive);
    if (history.length === 0) return { avgOriginal: 0, avgCalibrated: 0, multiplier: 1.0 };
    const avgOrig = history.reduce((s, e) => s + e.originalConfidence, 0) / history.length;
    const avgCal = history.reduce((s, e) => s + e.calibratedConfidence, 0) / history.length;
    return {
      avgOriginal: Math.round(avgOrig * 100) / 100,
      avgCalibrated: Math.round(avgCal * 100) / 100,
      multiplier: this.getMultiplier(executive),
    };
  }

  reset(executive?: string): void {
    if (executive) { this.currentMultiplier.set(executive, 1.0); this.calibrations.delete(executive); }
    else { this.currentMultiplier.clear(); this.calibrations.clear(); }
  }
}
