import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

const PROMOTE_THRESHOLD = 5;

export const PatternPromoter = {
  evaluate(block: KnowledgeBlock): boolean {
    if (block.type !== "procedural") return false;
    if (block.status === "confirmed") return false;

    const successCount = knowledgeBase.getAll().filter(b =>
      b.type === "episode" &&
      b.episode?.outcome === "success" &&
      b.episode?.eventType === block.procedural?.action,
    ).length;

    if (successCount >= PROMOTE_THRESHOLD) {
      knowledgeBase.update(block.id, { status: "confirmed", confidence: Math.max(block.confidence, 80) });
      return true;
    }
    return false;
  },

  evaluateAll(): string[] {
    const promoted: string[] = [];
    for (const block of knowledgeBase.getByType("procedural")) {
      if (this.evaluate(block)) promoted.push(block.id);
    }
    return promoted;
  },
};
