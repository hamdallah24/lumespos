import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

export const SemanticQuery = {
  byEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return knowledgeBase.getByEntity(entityType, entityId).filter(b => b.type === "semantic");
  },

  byDomain(domain: string): KnowledgeBlock[] {
    return knowledgeBase.getByDomain(domain).filter(b => b.type === "semantic");
  },

  byTag(tag: string): KnowledgeBlock[] {
    return knowledgeBase.getByTag(tag).filter(b => b.type === "semantic");
  },

  search(query: string): KnowledgeBlock[] {
    return knowledgeBase.search(query).filter(b => b.type === "semantic");
  },

  getFact(entityType: string, entityId: string | number, factPrefix: string): KnowledgeBlock[] {
    return this.byEntity(entityType, entityId).filter(b =>
      b.semantic?.fact.toLowerCase().startsWith(factPrefix.toLowerCase()),
    );
  },

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("semantic");
  },
};
