import type { KnowledgeBlock, KnowledgeType, KnowledgeStatus } from "./types";

export class KnowledgeBase {
  private blocks = new Map<string, KnowledgeBlock>();

  add(block: KnowledgeBlock): void {
    this.blocks.set(block.id, block);
  }

  get(id: string): KnowledgeBlock | undefined {
    return this.blocks.get(id);
  }

  update(id: string, updates: Partial<KnowledgeBlock>): boolean {
    const block = this.blocks.get(id);
    if (!block) return false;
    Object.assign(block, updates);
    return true;
  }

  delete(id: string): boolean {
    return this.blocks.delete(id);
  }

  getAll(): KnowledgeBlock[] {
    return Array.from(this.blocks.values());
  }

  getByType(type: KnowledgeType): KnowledgeBlock[] {
    return this.getAll().filter(b => b.type === type);
  }

  getByDomain(domain: string): KnowledgeBlock[] {
    return this.getAll().filter(b => b.domain === domain);
  }

  getByStatus(status: KnowledgeStatus): KnowledgeBlock[] {
    return this.getAll().filter(b => b.status === status);
  }

  getByEntity(entityType: string, entityId: string | number): KnowledgeBlock[] {
    return this.getAll().filter(b =>
      b.entityRefs.some(e => e.entityType === entityType && e.entityId === entityId),
    );
  }

  getByTag(tag: string): KnowledgeBlock[] {
    return this.getAll().filter(b => b.tags.includes(tag));
  }

  search(query: string): KnowledgeBlock[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(b =>
      b.summary.toLowerCase().includes(lower) ||
      b.topic.toLowerCase().includes(lower) ||
      b.tags.some(t => t.toLowerCase().includes(lower)),
    );
  }

  count(): number {
    return this.blocks.size;
  }

  clear(): void {
    this.blocks.clear();
  }
}

export const knowledgeBase = new KnowledgeBase();
