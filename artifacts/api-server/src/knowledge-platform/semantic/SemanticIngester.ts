import { semanticStore } from "./SemanticStore";
import type { KnowledgeBlock, EntityRef } from "../core/types";

let counter = 0;
function nextId(): string {
  counter++;
  return `SEM-${Date.now().toString(36)}-${counter}`;
}

export const SemanticIngester = {
  ingest(params: {
    fact: string;
    domain: string;
    topic: string;
    summary: string;
    source: string;
    entityRefs: EntityRef[];
    tags?: string[];
    expiresAt?: string;
  }): KnowledgeBlock {
    const block: KnowledgeBlock = {
      id: nextId(),
      type: "semantic",
      domain: params.domain,
      topic: params.topic,
      summary: params.summary,
      tags: params.tags ?? [],
      entityRefs: params.entityRefs,
      sourceRefs: [params.source],
      semantic: {
        fact: params.fact,
        source: params.source,
        verifiedAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
      },
      confidence: 80,
      importance: 50,
      recurrence: 0,
      firstObserved: new Date().toISOString(),
      lastObserved: new Date().toISOString(),
      status: "observed",
    };
    semanticStore.add(block);
    return block;
  },

  fromOperationalSituation(situation: {
    id: string;
    type: string;
    branchId?: number;
    description: string;
  }): KnowledgeBlock {
    return this.ingest({
      fact: `${situation.type} terjadi di branch ${situation.branchId ?? "unknown"}`,
      domain: "operations",
      topic: situation.type,
      summary: situation.description,
      source: `situation:${situation.id}`,
      entityRefs: [
        { entityType: "situation", entityId: situation.id, name: situation.type },
        ...(situation.branchId ? [{ entityType: "branch", entityId: situation.branchId, name: `Branch ${situation.branchId}` }] : []),
      ],
    });
  },
};
