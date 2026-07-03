// ECP-029.5: Knowledge Confidence Engine
// Frozen. Scores knowledge cards on usage, success rate, cross-runtime adoption.
// Confidence increases with use. Decreases with failure, contradiction, obsolescence.

import type { KnowledgeCard } from "./knowledge-card";

class KnowledgeConfidenceEngine {
  private _usageCounts = new Map<string, number>();

  /** Record a successful use of a card */
  recordSuccess(card: KnowledgeCard): void {
    const count = (this._usageCounts.get(card.id) || 0) + 1;
    this._usageCounts.set(card.id, count);

    card.confidence = Math.min(100, card.confidence + 1);
    if (count >= 500) card.confidence = Math.min(100, card.confidence + 2);
    card.lastUsed = new Date().toISOString();
  }

  /** Record a failure/contradiction */
  recordFailure(card: KnowledgeCard): void {
    card.confidence = Math.max(10, card.confidence - 5);
    card.contradictionCount++;
    card.lastUsed = new Date().toISOString();
  }

  /** Decay confidence for unused cards */
  decay(card: KnowledgeCard): void {
    const daysUnused = (Date.now() - new Date(card.lastUsed).getTime()) / 86400000;
    if (daysUnused > 7) {
      card.confidence = Math.max(10, card.confidence - Math.floor(daysUnused / 7));
    }
  }

  getUsageCount(id: string): number {
    return this._usageCounts.get(id) || 0;
  }
}

export const confidenceEngine = new KnowledgeConfidenceEngine();
