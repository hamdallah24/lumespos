// ECP-029.5: Knowledge Lifecycle Manager
// Frozen. Manages knowledge state transitions.
// RAW → VALIDATED → ACTIVE → BEST_PRACTICE → FOUNDATION_CANDIDATE → ARCHIVED

import type { KnowledgeCard, KnowledgeLifecycle } from "./knowledge-card";

interface TransitionRule {
  from: KnowledgeLifecycle;
  to: KnowledgeLifecycle;
  condition: (card: KnowledgeCard) => boolean;
}

const RULES: TransitionRule[] = [
  // RAW → VALIDATED: Minimum 3 source missions and confidence > 60
  { from: "RAW", to: "VALIDATED", condition: (c) => c.sourceCount >= 3 && c.confidence > 60 },

  // VALIDATED → ACTIVE: Used recently and no contradictions
  { from: "VALIDATED", to: "ACTIVE", condition: (c) => c.contradictionCount === 0 && c.confidence > 70 },

  // ACTIVE → BEST_PRACTICE: High confidence, many sources, widely used
  { from: "ACTIVE", to: "BEST_PRACTICE", condition: (c) => c.sourceCount >= 20 && c.confidence > 85 && c.importance > 70 },

  // BEST_PRACTICE → FOUNDATION_CANDIDATE: Very high confidence, stable, no contradictions
  { from: "BEST_PRACTICE", to: "FOUNDATION_CANDIDATE", condition: (c) => c.sourceCount >= 100 && c.confidence > 95 && c.contradictionCount === 0 },

  // Any → ARCHIVED: Not used for 30+ days OR confidence below 30
  { from: "ACTIVE", to: "ARCHIVED", condition: (c) => c.confidence < 30 || (Date.now() - new Date(c.lastUsed).getTime() > 30 * 86400000) },
  { from: "BEST_PRACTICE", to: "ARCHIVED", condition: (c) => c.confidence < 30 || (Date.now() - new Date(c.lastUsed).getTime() > 90 * 86400000) },
];

class KnowledgeLifecycleManager {
  private _cards = new Map<string, KnowledgeCard>();

  register(card: KnowledgeCard): void {
    this._cards.set(card.id, card);
  }

  /** Evaluate a card against all transition rules */
  evaluate(id: string): KnowledgeLifecycle | null {
    const card = this._cards.get(id);
    if (!card) return null;

    for (const rule of RULES) {
      if (card.status === rule.from && rule.condition(card)) {
        card.status = rule.to;
        card.lastUsed = new Date().toISOString();
        return rule.to;
      }
    }
    return null;
  }

  /** Evaluate all registered cards */
  evaluateAll(): Map<string, KnowledgeLifecycle> {
    const results = new Map<string, KnowledgeLifecycle>();
    for (const [id] of this._cards) {
      const result = this.evaluate(id);
      if (result) results.set(id, result);
    }
    return results;
  }

  getCards(): KnowledgeCard[] { return [...this._cards.values()]; }
  getByStatus(status: KnowledgeLifecycle): KnowledgeCard[] {
    return [...this._cards.values()].filter(c => c.status === status);
  }
}

export const lifecycleManager = new KnowledgeLifecycleManager();
