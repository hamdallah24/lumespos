import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

const DEPRECATE_FAILURE_THRESHOLD = 3;
const DEPRECATE_CONFIDENCE_THRESHOLD = 30;
const ARCHIVE_DAYS = 30;

export const DeprecationEngine = {
  evaluate(block: KnowledgeBlock): boolean {
    if (block.status === "deprecated" || block.status === "archived") return false;

    let failures = 0;
    if (block.type === "procedural" && block.procedural) {
      const episodes = knowledgeBase.getAll().filter(b =>
        b.type === "episode" &&
        b.episode?.eventType === block.procedural.action,
      );
      failures = episodes.filter(e => e.lastOutcome === "failure").length;
    } else if (block.lastOutcome === "failure") {
      failures = 1;
    }

    if (failures >= DEPRECATE_FAILURE_THRESHOLD || block.confidence < DEPRECATE_CONFIDENCE_THRESHOLD) {
      knowledgeBase.update(block.id, { status: "deprecated" });
      return true;
    }
    return false;
  },

  evaluateAll(): string[] {
    const deprecated: string[] = [];
    for (const block of knowledgeBase.getAll()) {
      if (this.evaluate(block)) deprecated.push(block.id);
    }
    return deprecated;
  },

  archiveUnused(): string[] {
    const archived: string[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ARCHIVE_DAYS);

    for (const block of knowledgeBase.getAll()) {
      if (block.status === "archived") continue;
      if (new Date(block.lastObserved) < cutoff && block.importance < 30) {
        knowledgeBase.update(block.id, { status: "archived" });
        archived.push(block.id);
      }
    }
    return archived;
  },
};
