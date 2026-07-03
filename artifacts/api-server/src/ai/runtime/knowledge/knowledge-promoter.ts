// ECP-029.5: Knowledge Promoter — auto-promotion rules
// Frozen. Rules: lesson → pattern → best practice → foundation candidate.
// 20 uses → Pattern. 100 uses → Best Practice. 500 uses → Foundation Proposal.
// Requires contradictions = 0 at each step.

import type { KnowledgeCard, KnowledgeLifecycle } from "./knowledge-card";
import { confidenceEngine } from "./knowledge-confidence";
import { promoteCard } from "./knowledge-card";

interface PromotionResult {
  card: KnowledgeCard;
  from: KnowledgeLifecycle;
  to: KnowledgeLifecycle | null;
  reason: string;
}

class KnowledgePromoter {
  evaluate(card: KnowledgeCard): PromotionResult {
    const usageCount = confidenceEngine.getUsageCount(card.id);
    const from = card.status;

    // Rule: 500+ uses, no contradictions, best practice → FOUNDATION_CANDIDATE
    if (card.status === "BEST_PRACTICE" && usageCount >= 500 && card.contradictionCount === 0) {
      promoteCard(card, "FOUNDATION_CANDIDATE");
      card.importance = 100;
      return { card, from, to: "FOUNDATION_CANDIDATE", reason: `${usageCount} uses with 0 contradictions` };
    }

    // Rule: 100+ uses, no contradictions → BEST_PRACTICE
    if ((card.status === "ACTIVE" || card.status === "VALIDATED") && usageCount >= 100 && card.contradictionCount === 0) {
      promoteCard(card, "BEST_PRACTICE");
      card.bestPractice = true;
      card.importance = Math.min(100, card.importance + 20);
      return { card, from, to: "BEST_PRACTICE", reason: `${usageCount} uses with 0 contradictions` };
    }

    // Rule: 20+ uses → boost to ACTIVE if not already
    if (card.status === "VALIDATED" && usageCount >= 20) {
      promoteCard(card, "ACTIVE");
      return { card, from, to: "ACTIVE", reason: `${usageCount} uses` };
    }

    return { card, from, to: null, reason: `Usage: ${usageCount}, status: ${from}` };
  }

  evaluateAll(cards: KnowledgeCard[]): PromotionResult[] {
    return cards.map(c => this.evaluate(c)).filter(r => r.to !== null);
  }
}

export const promoter = new KnowledgePromoter();
