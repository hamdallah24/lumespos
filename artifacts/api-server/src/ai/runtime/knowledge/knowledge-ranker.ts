// ECP-029.5: Knowledge Ranker
// Frozen. Ranks cards by importance, frequency, authority, freshness.
// Consultant uses ranked output for priority consumption.

import type { KnowledgeCard } from "./knowledge-card";
import { confidenceEngine } from "./knowledge-confidence";

interface RankedCard {
  card: KnowledgeCard;
  score: number;
  rank: number;
}

class KnowledgeRanker {
  rank(cards: KnowledgeCard[], limit = 20): RankedCard[] {
    const scored = cards.map(card => ({
      card,
      score: this.computeScore(card),
    }));

    scored.sort((a, b) => b.score - a.score);

    const limited = scored.slice(0, limit);
    return limited.map((s, i) => ({ ...s, rank: i + 1 }));
  }

  topByStatus(cards: KnowledgeCard[], status: string, limit = 10): RankedCard[] {
    const filtered = cards.filter(c => c.status === status);
    return this.rank(filtered, limit);
  }

  private computeScore(card: KnowledgeCard): number {
    const usageCount = confidenceEngine.getUsageCount(card.id);
    const daysSinceUsed = Math.max(1, (Date.now() - new Date(card.lastUsed).getTime()) / 86400000);

    return (
      card.confidence * 0.30 +        // Confidence matters most
      card.importance * 0.25 +        // Importance
      Math.log2(usageCount + 1) * 10 * 0.20 +  // Usage log scale
      (1 / Math.log2(daysSinceUsed + 2)) * 100 * 0.15 +  // Freshness
      (card.bestPractice ? 100 : 0) * 0.10
    );
  }
}

export const ranker = new KnowledgeRanker();
