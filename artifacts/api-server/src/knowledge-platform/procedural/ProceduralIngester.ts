import { proceduralStore } from "./ProceduralStore";
import type { KnowledgeBlock, EntityRef } from "../core/types";

let counter = 0;
function nextId(): string {
  counter++;
  return `PRO-${Date.now().toString(36)}-${counter}`;
}

export const ProceduralIngester = {
  ingest(params: {
    condition: string;
    action: string;
    parameters?: Record<string, unknown>;
    domain: string;
    topic: string;
    summary: string;
    entityRefs?: EntityRef[];
    tags?: string[];
  }): KnowledgeBlock {
    const block: KnowledgeBlock = {
      id: nextId(),
      type: "procedural",
      domain: params.domain,
      topic: params.topic,
      summary: params.summary,
      tags: params.tags ?? [],
      entityRefs: params.entityRefs ?? [],
      sourceRefs: [],
      procedural: {
        condition: params.condition,
        action: params.action,
        parameters: params.parameters ?? {},
        successRate: 0,
        executionCount: 0,
      },
      confidence: 50,
      importance: 50,
      recurrence: 1,
      firstObserved: new Date().toISOString(),
      lastObserved: new Date().toISOString(),
      status: "observed",
    };
    proceduralStore.add(block);
    return block;
  },

  fromRepeatedEpisodes(episodes: KnowledgeBlock[], pattern: {
    condition: string;
    action: string;
    domain: string;
    summary: string;
  }): KnowledgeBlock {
    const successes = episodes.filter(e => e.lastOutcome === "success").length;
    const total = episodes.length;
    const rate = total > 0 ? Math.round((successes / total) * 100) : 0;

    const block = this.ingest({
      condition: pattern.condition,
      action: pattern.action,
      domain: pattern.domain,
      topic: pattern.action,
      summary: pattern.summary,
      tags: episodes.flatMap(e => e.tags).filter((t, i, a) => a.indexOf(t) === i),
    });

    if (block.procedural) {
      block.procedural.successRate = rate;
      block.procedural.executionCount = total;
    }
    block.recurrence = total;
    block.sourceRefs = episodes.map(e => e.id);
    return block;
  },
};
