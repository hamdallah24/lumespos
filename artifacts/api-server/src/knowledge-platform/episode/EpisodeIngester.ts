import { episodeStore } from "./EpisodeStore";
import type { KnowledgeBlock, OutcomeStatus, EntityRef } from "../core/types";

let counter = 0;
function nextId(): string {
  counter++;
  return `EPI-${Date.now().toString(36)}-${counter}`;
}

export const EpisodeIngester = {
  ingest(params: {
    eventType: string;
    eventId: string;
    context: string;
    outcome: OutcomeStatus;
    domain: string;
    topic: string;
    summary: string;
    involvedEntities?: EntityRef[];
    tags?: string[];
  }): KnowledgeBlock {
    const block: KnowledgeBlock = {
      id: nextId(),
      type: "episode",
      domain: params.domain,
      topic: params.topic,
      summary: params.summary,
      tags: params.tags ?? [],
      entityRefs: params.involvedEntities ?? [],
      sourceRefs: [`event:${params.eventId}`],
      episode: {
        eventType: params.eventType,
        eventId: params.eventId,
        timestamp: new Date().toISOString(),
        context: params.context,
        outcome: params.outcome,
        involvedEntities: params.involvedEntities ?? [],
      },
      confidence: 90,
      importance: 50,
      recurrence: 1,
      firstObserved: new Date().toISOString(),
      lastObserved: new Date().toISOString(),
      lastOutcome: params.outcome,
      status: "observed",
    };
    episodeStore.add(block);
    return block;
  },

  fromResolvedSituation(situation: {
    id: string;
    type: string;
    branchId?: number;
    description: string;
    outcome: OutcomeStatus;
  }): KnowledgeBlock {
    return this.ingest({
      eventType: situation.type,
      eventId: situation.id,
      context: situation.description,
      outcome: situation.outcome,
      domain: "operations",
      topic: situation.type,
      summary: `Situation ${situation.id} resolved as ${situation.outcome}`,
      involvedEntities: [
        { entityType: "situation", entityId: situation.id, name: situation.type },
        ...(situation.branchId ? [{ entityType: "branch", entityId: situation.branchId, name: `Branch ${situation.branchId}` }] : []),
      ],
    });
  },
};
