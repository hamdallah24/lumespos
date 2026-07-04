// ECP-043 Sprint 5: Verification Intelligence
// Determines verification mode based on MissionProfile.
// No static verification levels. Adaptive to mission.

import type { MissionProfile, VerificationProfile, VerificationMode } from "./mission-profile";

const MODE_MATRIX: Record<string, VerificationMode> = {
  QUESTION:       "OFF",
  ANALYSIS:       "LIGHT",
  DEBUG:          "STRICT",
  IMPLEMENTATION: "STRICT",
  DEPLOYMENT:     "CONSENSUS",
  OPERATIONS:     "STRICT",
  BUSINESS:       "LIGHT",
};

export class VerificationProfileEngine {

  /** Compute verification profile from mission */
  compute(profile: MissionProfile): VerificationProfile {
    const mode = MODE_MATRIX[profile.category] || "LIGHT";

    // Confidence threshold by mode
    const confidenceThreshold: Record<VerificationMode, number> = {
      OFF: 0,
      LIGHT: 50,
      STRICT: 80,
      CONSENSUS: 90,
    };

    const threshold = confidenceThreshold[mode];

    // Elevate for critical urgency
    if (profile.urgency === "CRITICAL" && mode === "LIGHT") {
      return {
        mode: "STRICT",
        confidenceThreshold: 80,
        evidenceRequired: true,
        consensusRequired: false,
      };
    }

    // Reduce for cheap operations
    if (profile.executionCost === "CHEAP" && mode === "STRICT") {
      return {
        mode: "LIGHT",
        confidenceThreshold: 50,
        evidenceRequired: false,
        consensusRequired: false,
      };
    }

    return {
      mode,
      confidenceThreshold: threshold,
      evidenceRequired: mode === "STRICT" || mode === "CONSENSUS",
      consensusRequired: mode === "CONSENSUS",
    };
  }
}

export const verificationProfileEngine = new VerificationProfileEngine();
