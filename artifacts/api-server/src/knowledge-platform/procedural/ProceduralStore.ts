import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

export class ProceduralStore {
  add(block: KnowledgeBlock): void {
    knowledgeBase.add(block);
  }

  getByCondition(condition: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.procedural?.condition.toLowerCase().includes(condition.toLowerCase()),
    );
  }

  getByAction(action: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.procedural?.action === action,
    );
  }

  getBySuccessRate(minRate: number): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b => {
      if (b.type !== "procedural" || !b.procedural) return false;
      return b.procedural.successRate >= minRate;
    });
  }

  getBestPractices(): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.status === "confirmed" && b.confidence >= 70,
    );
  }

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("procedural");
  }

  count(): number {
    return this.getAll().length;
  }
}

export const proceduralStore = new ProceduralStore();
