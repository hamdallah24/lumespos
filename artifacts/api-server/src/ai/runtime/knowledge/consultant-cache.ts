// ECP-029.5: Consultant Cache Builder
// Frozen. Builds L1-L4 cache for Consultant Runtime.
// L1: Knowledge Cards (highest priority, lowest token cost)
// L2: Knowledge Graph (traversal)
// L3: Mission Summary (context)
// L4: Raw Mission Artifacts (last resort)
// Target: 90-95% queries answered from L1 alone.

import type { KnowledgeCard } from "./knowledge-card";
import { ranker } from "./knowledge-ranker";
import { generateSummary } from "./knowledge-summarizer";
import { generateIndex } from "./knowledge-index";
import type { KnowledgeSummary, ContextIndex } from "./knowledge-types";

interface ConsultantCache {
  generatedAt: string;
  targetTokenBudget: number;

  // L1: Top-ranked cards (cheapest to consume)
  l1Cards: KnowledgeCard[];

  // L2: Graph-context (next cheapest — traverse from L1)
  l2GraphHops: number;

  // L3: Summaries and indices
  l3Summary: KnowledgeSummary;
  l3Index: ContextIndex;

  // L4: Raw source count (most expensive — only if needed)
  l4RawSources: number;

  totalTokenEstimate: number;
}

class ConsultantCacheBuilder {
  build(cards: KnowledgeCard[], tokenBudget = 5000): ConsultantCache {
    const ranked = ranker.rank(cards, 20);

    const summary = generateSummary();
    const index = generateIndex(tokenBudget);

    const l1Text = ranked.map(r => r.card.summary).join(" ");

    return {
      generatedAt: new Date().toISOString(),
      targetTokenBudget: tokenBudget,
      l1Cards: ranked.map(r => r.card),
      l2GraphHops: 3,
      l3Summary: summary,
      l3Index: index,
      l4RawSources: cards.length,
      totalTokenEstimate: Math.ceil(l1Text.length / 4) + index.totalTokenEstimate,
    };
  }

  /** Check if L1 cache is sufficient for a query */
  isL1Sufficient(cache: ConsultantCache): boolean {
    return cache.l1Cards.length >= 5 && cache.totalTokenEstimate < cache.targetTokenBudget;
  }
}

export const consultantCache = new ConsultantCacheBuilder();
