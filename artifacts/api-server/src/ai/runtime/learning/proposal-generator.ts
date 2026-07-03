// ECP-033.5: Proposal Generator — auto-generates improvement proposals
// Frozen. Based on detected patterns. Goes to Consultant for review.

import type { ImprovementProposal } from "./learning-types";
import { learningStorage } from "./learning-storage";
import { patternEngine } from "./pattern-engine";

let _counter = 0;

class ProposalGenerator {
  generate(): ImprovementProposal[] {
    const patterns = patternEngine.detect();
    const proposals: ImprovementProposal[] = [];

    for (const pattern of patterns) {
      _counter++;
      const proposal: ImprovementProposal = {
        id: `proposal-${_counter}`,
        source: pattern.id,
        type: pattern.type === "domain_pattern" ? "architecture" : "process",
        description: pattern.description,
        expectedImpact: pattern.recommendation,
        estimatedEffort: pattern.impact === "high" ? "2 sprints" : "1 sprint",
        confidence: pattern.confidence,
        status: "pending",
        targetRuntime: pattern.type === "confidence_bias" ? pattern.description.split(" ")[0] : undefined,
        createdAt: new Date().toISOString(),
      };

      proposals.push(proposal);
      learningStorage.storeProposal(proposal);
    }

    return proposals;
  }
}

export const proposalGenerator = new ProposalGenerator();
