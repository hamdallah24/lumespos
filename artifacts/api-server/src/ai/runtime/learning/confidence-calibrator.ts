// ECP-033.5: Confidence Calibrator — measures prediction accuracy
// Frozen. High confidence + failure = overconfident. Low confidence + success = underconfident.

import type { ConfidenceCalibration } from "./learning-types";
import { learningStorage } from "./learning-storage";

class ConfidenceCalibrator {
  calibrate(runtime: string): ConfidenceCalibration {
    const outcomes = learningStorage.getOutcomes(runtime, 100);
    const calibration: ConfidenceCalibration = {
      runtime, totalPredictions: outcomes.length,
      overConfident: 0, underConfident: 0, calibrated: 0,
      calibrationScore: 100, lastUpdated: new Date().toISOString(),
    };

    if (outcomes.length === 0) return calibration;

    for (const o of outcomes) {
      if (o.predictionError <= 15) calibration.calibrated++;
      else if (o.confidence > 50 && o.actualOutcome !== "SUCCESS") calibration.overConfident++;
      else if (o.confidence < 50 && o.actualOutcome === "SUCCESS") calibration.underConfident++;
    }

    calibration.calibrationScore = Math.round(
      100 - (calibration.overConfident + calibration.underConfident) / calibration.totalPredictions * 100
    );

    learningStorage.storeCalibration(calibration);
    return calibration;
  }

  calibrateAll(): ConfidenceCalibration[] {
    const runtimes = new Set(learningStorage.getOutcomes().map(o => o.runtime));
    return [...runtimes].map(r => this.calibrate(r));
  }
}

export const confidenceCalibrator = new ConfidenceCalibrator();
