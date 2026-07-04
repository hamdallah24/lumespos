// ADR-009 Phase 4: Confidence Config v1
// Versioned, metadata-rich configuration for confidence weights.
// Tuning changes = new version. Old versions remain for audit replay.

import type { ConfidenceConfig } from "./MetricTypes";

export const confidenceConfigV1: ConfidenceConfig = {
  version: "1.0.0",
  createdAt: "2026-07-05",
  createdBy: "ADR-009",
  description: "Initial confidence weights — 40% evidence, 30% verification, 20% reflection, 10% consistency",
  weights: {
    evidence: 0.40,
    verification: 0.30,
    reflection: 0.20,
    consistency: 0.10,
  },
};
