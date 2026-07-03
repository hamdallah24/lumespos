// ECP-029.5: Knowledge Deduplicator
// Frozen. Detects and merges duplicate knowledge cards.
// Similarity >95% → merge. 70-95% → link. <70% → new card.

import type { KnowledgeCard } from "./knowledge-card";

class KnowledgeDeduplicator {
  private _cards: KnowledgeCard[] = [];

  register(card: KnowledgeCard): void {
    this._cards.push(card);
  }

  /** Find similar cards. Returns: action + matched cards */
  check(newCard: KnowledgeCard): { action: "merge" | "link" | "new"; matches: KnowledgeCard[] } {
    const matches: KnowledgeCard[] = [];

    for (const existing of this._cards) {
      if (existing.id === newCard.id) continue;
      const similarity = this.computeSimilarity(newCard, existing);

      if (similarity > 0.95) {
        matches.push(existing);
        return { action: "merge", matches };
      }
      if (similarity > 0.70) {
        matches.push(existing);
      }
    }

    if (matches.length > 0) return { action: "link", matches };
    return { action: "new", matches: [] };
  }

  /** Merge new card into existing */
  merge(newCard: KnowledgeCard, existing: KnowledgeCard): KnowledgeCard {
    existing.sourceCount += newCard.sourceCount;
    existing.tags = [...new Set([...existing.tags, ...newCard.tags])];
    existing.lastUsed = new Date().toISOString();
    existing.confidence = Math.min(100, existing.confidence + 2);
    return existing;
  }

  /** Link two cards */
  link(card1: KnowledgeCard, card2: KnowledgeCard): void {
    if (!card1.relatedCards.includes(card2.id)) card1.relatedCards.push(card2.id);
    if (!card2.relatedCards.includes(card1.id)) card2.relatedCards.push(card1.id);
  }

  private computeSimilarity(a: KnowledgeCard, b: KnowledgeCard): number {
    const aWords = new Set(a.topic.toLowerCase().split(/\s+/));
    const bWords = new Set(b.topic.toLowerCase().split(/\s+/));
    const intersection = new Set([...aWords].filter(w => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);

    const topicScore = union.size > 0 ? intersection.size / union.size : 0;
    const tagOverlap = a.tags.filter(t => b.tags.includes(t)).length / Math.max(a.tags.length + b.tags.length, 1);

    return topicScore * 0.6 + tagOverlap * 0.4;
  }
}

export const deduplicator = new KnowledgeDeduplicator();
