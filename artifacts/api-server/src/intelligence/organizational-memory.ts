// ECP-045 Sprint 1: Organizational Memory
// Validated knowledge only. Not raw executive memory.
// Sources from multiple executives must confirm before validation.

import type { OrgKnowledgeNode, OrgKnowledgeType, ExecutiveRole } from "./intelligence-types";
import { createOrgNodeId } from "./intelligence-types";

export class OrganizationalMemory {
  private nodes: Map<string, OrgKnowledgeNode> = new Map();

  /** Add candidate knowledge (requires 2+ sources to validate) */
  propose(
    content: string,
    type: OrgKnowledgeType,
    domain: string,
    sourceExecutive: ExecutiveRole,
    tags: string[] = [],
  ): OrgKnowledgeNode {
    // Check if similar knowledge already exists
    const similar = this.findSimilar(content, domain);
    if (similar) {
      if (!similar.sources.includes(sourceExecutive)) {
        similar.sources.push(sourceExecutive);
      }
      similar.reinforcementCount++;
      similar.lastReinforced = new Date().toISOString();
      if (similar.sources.length >= 2) similar.validated = true;
      return similar;
    }

    const node: OrgKnowledgeNode = {
      id: createOrgNodeId(),
      type,
      content,
      sources: [sourceExecutive],
      domain,
      confidence: 60,
      validated: false,
      validatedBy: [],
      createdAt: new Date().toISOString(),
      lastReinforced: new Date().toISOString(),
      reinforcementCount: 1,
      tags,
    };
    this.nodes.set(node.id, node);
    return node;
  }

  /** Validate a knowledge node (by CEO or 2+ confirmations) */
  validate(nodeId: string, validator: ExecutiveRole): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    if (!node.validatedBy.includes(validator)) {
      node.validatedBy.push(validator);
    }
    if (node.sources.length >= 2 || node.validatedBy.length >= 1) {
      node.validated = true;
      node.confidence = Math.min(100, node.confidence + 15);
    }
    return true;
  }

  /** Get validated knowledge by domain */
  getByDomain(domain: string): OrgKnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.domain === domain && n.validated)
      .sort((a, b) => b.reinforcementCount - a.reinforcementCount);
  }

  /** Get validated knowledge by type */
  getByType(type: OrgKnowledgeType): OrgKnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.type === type && n.validated)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Search organizational knowledge */
  search(query: string): OrgKnowledgeNode[] {
    const lower = query.toLowerCase();
    const keywords = lower.split(/\s+/).filter(w => w.length > 2);
    return [...this.nodes.values()]
      .filter(n => n.validated && keywords.some(kw =>
        n.content.toLowerCase().includes(kw) ||
        n.domain.toLowerCase().includes(kw) ||
        n.tags.some(t => t.toLowerCase().includes(kw))
      ))
      .sort((a, b) => b.reinforcementCount * b.confidence - a.reinforcementCount * a.confidence)
      .slice(0, 20);
  }

  /** Get all validated nodes */
  all(): OrgKnowledgeNode[] {
    return [...this.nodes.values()].filter(n => n.validated);
  }

  /** Get by tag */
  getByTag(tag: string): OrgKnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.validated && n.tags.includes(tag))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Stats */
  stats() {
    const all = [...this.nodes.values()];
    const validated = all.filter(n => n.validated);
    const byDomain: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const n of validated) {
      byDomain[n.domain] = (byDomain[n.domain] || 0) + 1;
      byType[n.type] = (byType[n.type] || 0) + 1;
    }
    return {
      total: all.length,
      validated: validated.length,
      pendingValidation: all.length - validated.length,
      avgConfidence: validated.length > 0
        ? Math.round(validated.reduce((s, n) => s + n.confidence, 0) / validated.length)
        : 0,
      byDomain,
      byType,
    };
  }

  private findSimilar(content: string, domain: string): OrgKnowledgeNode | null {
    const words = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 4));
    let best: OrgKnowledgeNode | null = null;
    let bestScore = 0;

    for (const node of this.nodes.values()) {
      if (node.domain !== domain) continue;
      const nodeWords = new Set(node.content.toLowerCase().split(/\s+/).filter(w => w.length > 4));
      const overlap = [...words].filter(w => nodeWords.has(w)).length;
      const score = overlap / Math.max(words.size, nodeWords.size);
      if (score > 0.5 && score > bestScore) {
        best = node;
        bestScore = score;
      }
    }

    return best;
  }
}

export const organizationalMemory = new OrganizationalMemory();
