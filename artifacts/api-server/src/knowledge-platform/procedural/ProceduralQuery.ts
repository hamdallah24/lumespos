import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

export const ProceduralQuery = {
  byCondition(condition: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.procedural?.condition.toLowerCase().includes(condition.toLowerCase()),
    );
  },

  byAction(action: string): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.procedural?.action === action,
    );
  },

  byDomain(domain: string): KnowledgeBlock[] {
    return knowledgeBase.getByDomain(domain).filter(b => b.type === "procedural");
  },

  bestPractices(): KnowledgeBlock[] {
    return knowledgeBase.getAll().filter(b =>
      b.type === "procedural" && b.status === "confirmed" && b.confidence >= 70,
    ).sort((a, b) => b.confidence - a.confidence);
  },

  search(query: string): KnowledgeBlock[] {
    return knowledgeBase.search(query).filter(b => b.type === "procedural");
  },

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("procedural");
  },
};
