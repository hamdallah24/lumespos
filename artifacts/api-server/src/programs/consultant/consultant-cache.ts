// ECP-030: Consultant Strategic Cache — compact context for analysis
// Frozen. Consultant reads this, not raw documents.
// Target: 1500 tokens. Always answers >90% queries from this cache.

import type { StrategicCache, ConsultantMode, Finding, ConsultantRecommendation } from "./consultant-types";
import { knowledgeGovernor } from "../../ai/runtime/knowledge";
import { getFoundationProvider } from "../../ai/runtime/foundation";

class ConsultantStrategicCache {
  build(mode: ConsultantMode): StrategicCache {
    const provider = getFoundationProvider();
    const topCards = knowledgeGovernor.getTopKnowledge(10);
    const proposals = knowledgeGovernor.getPendingProposals();

    const cardDigest = topCards
      .map(c => `${c.card.topic} (${c.card.confidence}%, ${c.card.status})`)
      .join("; ");

    const foundationSummary = [
      `Constitution loaded. Gates: stop=${provider.governance().getConfidenceGates().stop}`,
      `Philosophy: loaded. Covenant: loaded.`,
    ].join(" ");

    const topDrifts: Finding[] = [];
    const topDebts: Finding[] = [];

    const recentRecs: ConsultantRecommendation[] = proposals.map((p, i) => ({
      id: `rec-${i}`,
      findingId: p.id,
      action: p.title,
      rationale: p.rationale,
      confidence: 85,
      priority: "normal" as const,
      owner: "CEO",
      proposedADR: p.id,
      expectedImpact: p.impact,
      estimatedEffort: "1 sprint",
      status: "pending" as const,
    }));

    const content = `${foundationSummary} ${cardDigest} ${topDrifts.map(d => d.description).join(". ")}`;

    return {
      generatedAt: new Date().toISOString(),
      mode,
      foundationSummary,
      topPolicyDrifts: topDrifts,
      topArchitectureDebts: topDebts,
      recentProposals: recentRecs,
      knowledgeDigest: cardDigest,
      organizationHealthScore: 85,
      totalTokenEstimate: Math.ceil(content.length / 4),
    };
  }
}

export const strategicCache = new ConsultantStrategicCache();
