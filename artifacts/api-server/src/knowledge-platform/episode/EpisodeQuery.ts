import { knowledgeBase } from "../core";
import type { KnowledgeBlock, OutcomeStatus } from "../core/types";

export const EpisodeQuery = {
  byEventType(eventType: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "episode" && b.episode?.eventType === eventType,
    );
  },

  byOutcome(outcome: OutcomeStatus): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "episode" && b.episode?.outcome === outcome,
    );
  },

  byTimeRange(from: string, to: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b => {
      if (b.type !== "episode" || !b.episode) return false;
      return b.episode.timestamp >= from && b.episode.timestamp <= to;
    });
  },

  byEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return knowledgeBase.getByEntity(entityType, entityId).filter(b => b.type === "episode");
  },

  byDomain(domain: string): KnowledgeBlock[] {
    return knowledgeBase.getByDomain(domain).filter(b => b.type === "episode");
  },

  latest(limit: number = 10): KnowledgeBlock[] {
    return knowledgeBase.getByType("episode")
      .sort((a, b) => (b.episode?.timestamp ?? "").localeCompare(a.episode?.timestamp ?? ""))
      .slice(0, limit);
  },

  search(query: string): KnowledgeBlock[] {
    return knowledgeBase.search(query).filter(b => b.type === "episode");
  },

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("episode");
  },
};
