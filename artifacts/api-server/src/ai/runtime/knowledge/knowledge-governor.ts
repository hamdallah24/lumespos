// ECP-029.5: Knowledge Governor — Chief Knowledge Office orchestrator
// Frozen. Coordinates all knowledge subsystems.
// Consultant Runtime depends on this governor, not individual components.

import type { KnowledgeCard } from "./knowledge-card";
import { lifecycleManager } from "./knowledge-lifecycle";
import { confidenceEngine } from "./knowledge-confidence";
import { deduplicator } from "./knowledge-deduplicator";
import { contradictionDetector } from "./knowledge-contradiction";
import { ranker } from "./knowledge-ranker";
import { promoter } from "./knowledge-promoter";
import { archiveManager } from "./knowledge-archive";
import { knowledgeGraph } from "./knowledge-graph";
import { consultantCache } from "./consultant-cache";
import { proposalGenerator } from "./foundation-proposal";
import { createCard } from "./knowledge-card";

class KnowledgeGovernor {
  private _started = false;

  start(): void {
    if (this._started) return;
    this._started = true;
  }

  /** Register a new knowledge artifact as a card */
  register(topic: string, summary: string, sourceCount = 1, tags: string[] = []): KnowledgeCard {
    const card = createCard(`kc-${Date.now()}`, topic, summary, sourceCount, tags);

    // Deduplicate first
    const dedup = deduplicator.check(card);
    if (dedup.action === "merge" && dedup.matches.length > 0) {
      return deduplicator.merge(card, dedup.matches[0]);
    }
    if (dedup.action === "link") {
      for (const match of dedup.matches) {
        deduplicator.link(card, match);
      }
    }

    deduplicator.register(card);
    lifecycleManager.register(card);
    knowledgeGraph.addCard(card);

    return card;
  }

  /** Run a maintenance cycle — evaluate all cards */
  maintenance(): {
    promotions: number;
    archives: number;
    contradictions: number;
    proposals: number;
  } {
    const cards = lifecycleManager.getCards();

    // 1. Lifecycle transitions
    lifecycleManager.evaluateAll();

    // 2. Promotions
    const promos = promoter.evaluateAll(cards);

    // 3. Archives
    const archived = archiveManager.autoArchive(cards);

    // 4. Contradictions
    const activeCards = cards.filter(c => c.status !== "ARCHIVED");
    const contradictions = contradictionDetector.scan(activeCards);
    for (const result of contradictions) {
      for (const card of result.cards) {
        confidenceEngine.recordFailure(card);
      }
    }

    // 5. Foundation proposals
    const proposals = proposalGenerator.scanAndPropose(cards);

    return {
      promotions: promos.length,
      archives: archived.length,
      contradictions: contradictions.length,
      proposals: proposals.length,
    };
  }

  /** Get consultant-ready cache */
  getConsultantCache(tokenBudget = 5000) {
    const activeCards = lifecycleManager.getCards().filter(c => c.status !== "ARCHIVED");
    return consultantCache.build(activeCards, tokenBudget);
  }

  /** Get ranked cards */
  getTopKnowledge(limit = 10) {
    const activeCards = lifecycleManager.getCards().filter(c => c.status !== "ARCHIVED");
    return ranker.rank(activeCards, limit);
  }

  /** Get all pending foundation proposals */
  getPendingProposals() {
    return proposalGenerator.getPending();
  }
}

export const knowledgeGovernor = new KnowledgeGovernor();
