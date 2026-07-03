// ECP-029.5: Knowledge Contradiction Detector
// Frozen. Detects when two knowledge cards contradict each other.
// Contradictions enter review, not auto-deleted.

import type { KnowledgeCard } from "./knowledge-card";

interface ContradictionResult {
  found: boolean;
  cards: KnowledgeCard[];
  description: string;
}

const CONTRADICTION_KEYWORDS: [string, string][] = [
  ["always", "never"],
  ["increase", "decrease"],
  ["must", "must not"],
  ["should", "should not"],
  ["recommended", "forbidden"],
];

class ContradictionDetector {
  detect(card1: KnowledgeCard, card2: KnowledgeCard): ContradictionResult {
    const summary1 = card1.summary.toLowerCase();
    const summary2 = card2.summary.toLowerCase();

    for (const [pos, neg] of CONTRADICTION_KEYWORDS) {
      if (summary1.includes(pos) && summary2.includes(neg)) {
        return {
          found: true,
          cards: [card1, card2],
          description: `"${card1.topic}" uses "${pos}" while "${card2.topic}" uses "${neg}"`,
        };
      }
      if (summary1.includes(neg) && summary2.includes(pos)) {
        return {
          found: true,
          cards: [card1, card2],
          description: `"${card1.topic}" uses "${neg}" while "${card2.topic}" uses "${pos}"`,
        };
      }
    }

    return { found: false, cards: [], description: "" };
  }

  /** Scan all cards for contradictions */
  scan(cards: KnowledgeCard[]): ContradictionResult[] {
    const results: ContradictionResult[] = [];

    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const result = this.detect(cards[i], cards[j]);
        if (result.found) results.push(result);
      }
    }

    return results;
  }
}

export const contradictionDetector = new ContradictionDetector();
