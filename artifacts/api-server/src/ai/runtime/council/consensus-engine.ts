// ECP-033: Consensus Engine — weighted consensus, not majority vote
// Frozen. CEO weight 1.0, Consultant 0.95, CTO 0.90, COO 0.80.

import type { CouncilOpinion, ConsensusResult } from "./types";
import { participantEngine } from "./participant";

class ConsensusEngine {
  compute(opinions: CouncilOpinion[]): ConsensusResult {
    if (opinions.length === 0) {
      return { consensusScore: 0, recommendation: "ESCALATE", totalWeight: 0, votes: [], requiresEscalation: true, reason: "No opinions submitted" };
    }

    const tally: Record<string, { weight: number; count: number }> = {};
    let totalWeight = 0;
    let maxWeight = 0;
    let topRecommendation = "WAIT";

    for (const opinion of opinions) {
      const weight = participantEngine.getWeight(opinion.runtime);
      totalWeight += weight;

      if (!tally[opinion.recommendation]) {
        tally[opinion.recommendation] = { weight: 0, count: 0 };
      }
      tally[opinion.recommendation].weight += weight;
      tally[opinion.recommendation].count++;

      if (tally[opinion.recommendation].weight > maxWeight) {
        maxWeight = tally[opinion.recommendation].weight;
        topRecommendation = opinion.recommendation;
      }
    }

    const consensusScore = totalWeight > 0 ? Math.round((maxWeight / totalWeight) * 100) : 0;
    const votes = Object.entries(tally).map(([rec, data]) => ({
      recommendation: rec, weight: Math.round(data.weight * 100) / 100, count: data.count,
    }));

    const requiresEscalation = consensusScore < 60 || opinions.some(o => o.recommendation === "REJECT");

    return {
      consensusScore,
      recommendation: topRecommendation as ConsensusResult["recommendation"],
      totalWeight: Math.round(totalWeight * 100) / 100,
      votes,
      requiresEscalation,
      reason: requiresEscalation ? "Consensus below threshold or dissenting opinions" : `Consensus reached at ${consensusScore}%`,
    };
  }
}

export const consensusEngine = new ConsensusEngine();
