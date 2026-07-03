// ECP-023: Trust Domain — trust dimension weights, initial scores
// Frozen. Trust engine configuration.

import type { ITrustDomain } from "../types/provider-interfaces";
import type { TrustWeights, TrustInitialScores } from "../types/foundation-types";

const TRUST_WEIGHTS: TrustWeights = {
  technicalAccuracy: 0.30,
  deploymentReliability: 0.25,
  proposalQuality: 0.20,
  securityCompliance: 0.15,
  communication: 0.05,
  responseTime: 0.05,
};

const INITIAL_SCORES: TrustInitialScores = {
  technicalAccuracy: 85,
  deploymentReliability: 85,
  proposalQuality: 85,
  communication: 85,
  securityCompliance: 100,
  responseTime: 80,
};

class TrustDomain implements ITrustDomain {
  getWeights(): TrustWeights {
    return TRUST_WEIGHTS;
  }

  getDimensions(): string[] {
    return Object.keys(TRUST_WEIGHTS);
  }

  initialScores(): TrustInitialScores {
    return INITIAL_SCORES;
  }

  threshold(): number {
    return 50;
  }
}

export const trustDomain = new TrustDomain();
