import { knowledgeBase } from "../core";
import type { KnowledgeBlock } from "../core/types";

export class SemanticStore {
  add(block: KnowledgeBlock): void {
    knowledgeBase.add(block);
  }

  getByEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return knowledgeBase.getByEntity(entityType, entityId);
  }

  getByFact(fact: string): KnowledgeBlock | undefined {
    return knowledgeBase.getAll().find(b =>
      b.type === "semantic" && b.semantic?.fact.toLowerCase() === fact.toLowerCase(),
    );
  }

  updateFact(id: string, fact: string): boolean {
    const block = knowledgeBase.get(id);
    if (!block || !block.semantic) return false;
    block.semantic.fact = fact;
    block.lastObserved = new Date().toISOString();
    return true;
  }

  getAll(): KnowledgeBlock[] {
    return knowledgeBase.getByType("semantic");
  }

  getExpired(): KnowledgeBlock[] {
    const now = new Date().toISOString();
    return this.getAll().filter(b =>
      b.semantic?.expiresAt && b.semantic.expiresAt <= now,
    );
  }

  count(): number {
    return this.getAll().length;
  }
}

export const semanticStore = new SemanticStore();
