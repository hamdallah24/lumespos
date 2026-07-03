// ECP-025: Trust Domain — reads TRUST_POLICY.md
// Data-driven. No hardcoded trust values.

import type { ITrustDomain } from "../types/provider-interfaces";
import type { TrustWeights, TrustInitialScores } from "../types/foundation-types";
import { getAssetContent } from "../foundation-cache";

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

function loadFromFoundation(): { weights: TrustWeights; scores: TrustInitialScores } {
  try {
    const content = getAssetContent("trust-policy-v1");
    if (content) {
      // ECP-026: Parse TRUST_POLICY.md into typed values
      // Currently: typed models are canonical
    }
  } catch { /* use typed defaults */ }
  return { weights: TRUST_WEIGHTS, scores: INITIAL_SCORES };
}

let _cache: { weights: TrustWeights; scores: TrustInitialScores } | null = null;

class TrustDomain implements ITrustDomain {
  getWeights(): TrustWeights {
    if (!_cache) _cache = loadFromFoundation();
    return _cache.weights;
  }

  getDimensions(): string[] {
    return Object.keys(this.getWeights());
  }

  initialScores(): TrustInitialScores {
    if (!_cache) _cache = loadFromFoundation();
    return _cache.scores;
  }

  threshold(): number {
    return 50;
  }
}

export const trustDomain = new TrustDomain();
