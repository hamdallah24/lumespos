import { knowledgeBase } from "../core";
import type { KnowledgeBlock, OutcomeStatus, EntityRef } from "../core/types";

export class EpisodeStore {
  add(block: KnowledgeBlock): void {
    knowledgeBase.add(block);
  }

  getByEventType(eventType: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "episode" && b.episode?.eventType === eventType,
    );
  }

  getByOutcome(outcome: OutcomeStatus): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "episode" && b.episode?.outcome === outcome,
    );
  }

  getByTimeRange(from: string, to: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b => {
      if (b.type !== "episode" || !b.episode) return false;
      const ts = b.episode.timestamp;
      return ts >= from && ts <= to;
    });
  }

  getByEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return knowledgeBase.getByEntity(entityType, entityId).filter(b => b.type === "episode");
  }

  getLatest(limit: number = 10): KnowledgeBlock[] {
    return knowledgeBase.getByType("episode")
      .sort((a, b) => (b.episode?.timestamp ?? "").localeCompare(a.episode?.timestamp ?? ""))
      .slice(0, limit);
  }

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("episode");
  }

  count(): number {
    return this.getAll().length;
  }
}

export const episodeStore = new EpisodeStore();
