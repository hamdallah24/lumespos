// ADR-009 Phase 4: Confidence Engine
// Computes confidence from evidence + verification + reflection + consistency.
// Weighted composite — config-driven, not hardcoded.

import type { EvidenceScore } from "./MetricTypes";
import { confidenceConfigV1 } from "./confidence-config-v1";

export class ConfidenceEngine {
  private config = confidenceConfigV1;

  compute(
    evidence: EvidenceScore,
    verificationPassed: boolean,
    reflectionScore: number,
    consistencyScore: number,
  ): number {
    const w = this.config.weights;
    return Math.min(100, Math.round(
      (evidence.quality * w.evidence * 100) +
      ((verificationPassed ? 1 : 0.2) * w.verification * 100) +
      ((reflectionScore / 100) * w.reflection * 100) +
      ((consistencyScore / 100) * w.consistency * 100)
    ));
  }

  /** Get current config */
  getConfig() { return { ...this.config }; }

  /** Set config (e.g., load v2) */
  setConfig(config: typeof this.config) { this.config = config; }
}

export const confidenceEngine = new ConfidenceEngine();
