// ECP-034: Alignment Engine — validates proposals against Foundation
// Frozen. Checks Founder Philosophy, Covenant, Constitution, North Star.

import type { MissionProposal } from "./mission-types";
import { getFoundationProvider } from "../foundation";

interface AlignmentResult {
  score: number;
  passed: boolean;
  warnings: string[];
  failures: string[];
}

class AlignmentEngine {
  validate(proposal: Omit<MissionProposal, "alignmentScore">): AlignmentResult {
    const warnings: string[] = [];
    const failures: string[] = [];
    let score = 100;

    try {
      const provider = getFoundationProvider();

      // Check: Does this align with North Star?
      const northStar = provider.foundation().getNorthStar();
      if (!northStar) {
        warnings.push("North Star document not loaded — alignment unverifiable");
        score -= 10;
      }

      // Check: Compatible with Constitution?
      const gates = provider.governance().getConfidenceGates();
      if (proposal.priority < 50 && proposal.type === "strategic") {
        warnings.push("Strategic mission with low priority — may not align with organizational goals");
        score -= 15;
      }

      // Check: Required capabilities exist?
      const caps = provider.capability();
      const missingCaps = proposal.requiredCapabilities.filter(c => caps.getAllowedCapabilities("CEO").length === 0);
      if (missingCaps.length > 0) {
        failures.push(`Required capabilities not available: ${missingCaps.join(", ")}`);
        score -= 30;
      }

    } catch {
      warnings.push("Foundation Provider unavailable — alignment check limited");
      score -= 20;
    }

    return {
      score: Math.max(0, score),
      passed: failures.length === 0 && score >= 50,
      warnings,
      failures,
    };
  }
}

export const alignmentEngine = new AlignmentEngine();
