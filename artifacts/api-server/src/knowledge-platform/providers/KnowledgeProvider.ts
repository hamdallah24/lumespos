import { knowledgeBase } from "../core";
import type { KnowledgeBlock, KnowledgeType, KnowledgeStatus, OutcomeStatus, EntityRef } from "../core/types";
import { semanticStore } from "../semantic";
import { SemanticIngester } from "../semantic";
import { SemanticQuery } from "../semantic";
import { episodeStore } from "../episode";
import { EpisodeIngester } from "../episode";
import { EpisodeQuery } from "../episode";
import { proceduralStore } from "../procedural";
import { ProceduralIngester } from "../procedural";
import { ProceduralQuery } from "../procedural";
import { learningEngine } from "../learning";

export const KnowledgeProvider = {
  // ── Ingest ──
  ingestSemantic(params: {
    fact: string; domain: string; topic: string; summary: string;
    source: string; entityRefs: EntityRef[]; tags?: string[]; expiresAt?: string;
  }): KnowledgeBlock {
    return SemanticIngester.ingest(params);
  },

  ingestEpisode(params: {
    eventType: string; eventId: string; context: string; outcome: OutcomeStatus;
    domain: string; topic: string; summary: string;
    involvedEntities?: EntityRef[]; tags?: string[];
  }): KnowledgeBlock {
    return EpisodeIngester.ingest(params);
  },

  ingestProcedural(params: {
    condition: string; action: string; parameters?: Record<string, unknown>;
    domain: string; topic: string; summary: string;
    entityRefs?: EntityRef[]; tags?: string[];
  }): KnowledgeBlock {
    return ProceduralIngester.ingest(params);
  },

  // ── Query ──
  querySemantic(query: string): KnowledgeBlock[] {
    return SemanticQuery.search(query);
  },

  queryEpisode(query: string): KnowledgeBlock[] {
    return EpisodeQuery.search(query);
  },

  queryProcedural(query: string): KnowledgeBlock[] {
    return ProceduralQuery.search(query);
  },

  searchAll(query: string): KnowledgeBlock[] {
    return knowledgeBase.search(query);
  },

  getById(id: string): KnowledgeBlock | undefined {
    return knowledgeBase.get(id);
  },

  getByType(type: KnowledgeType): KnowledgeBlock[] {
    return knowledgeBase.getByType(type);
  },

  getByDomain(domain: string): KnowledgeBlock[] {
    return knowledgeBase.getByDomain(domain);
  },

  getByEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return knowledgeBase.getByEntity(entityType, entityId);
  },

  getBestPractices(): KnowledgeBlock[] {
    return ProceduralQuery.bestPractices();
  },

  getLatestEpisodes(limit?: number): KnowledgeBlock[] {
    return EpisodeQuery.latest(limit);
  },

  // ── Learning ──
  recordOutcome(blockId: string, outcome: OutcomeStatus): void {
    learningEngine.processOutcome(blockId, outcome);
  },

  /** Batch process outcomes for all episode blocks — pairs each episode with its related knowledge block */
  processEpisodeOutcomes(): number {
    const episodes = episodeStore.getAll();
    let count = 0;
    for (const ep of episodes) {
      const outcome = ep.episode?.outcome;
      if (outcome && ep.id) {
        try {
          this.recordOutcome(ep.id, outcome);
          count++;
        } catch { /* skip failed outcomes */ }
      }
    }
    return count;
  },

  runMaintenance(): { promoted: string[]; deprecated: string[]; archived: string[] } {
    return learningEngine.runMaintenance();
  },

  getStats() {
    return {
      total: knowledgeBase.count(),
      semantic: semanticStore.count(),
      episode: episodeStore.count(),
      procedural: proceduralStore.count(),
      learning: learningEngine.getStats(),
    };
  },

  // ── Admin ──
  clear(): void {
    knowledgeBase.clear();
  },
};
