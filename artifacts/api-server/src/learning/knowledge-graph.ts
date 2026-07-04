// ECP-044 Sprint 4: Knowledge Graph
// Stores knowledge as a graph, not text. Supports traversal.
// Nodes connected via relatesTo. Domain-based queries.

import type { KnowledgeNode, NodeType } from "./learning-types";

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();

  /** Add a node to the graph */
  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
  }

  /** Add multiple nodes */
  addNodes(nodes: KnowledgeNode[]): void {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  /** Get node by ID */
  getNode(id: string): KnowledgeNode | null {
    return this.nodes.get(id) || null;
  }

  /** Find nodes by domain */
  findByDomain(domain: string): KnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.domain === domain)
      .sort((a, b) => b.reinforced - a.reinforced);
  }

  /** Find nodes by type */
  findByType(type: NodeType): KnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.type === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Find nodes by executive */
  findByExecutive(executive: string): KnowledgeNode[] {
    return [...this.nodes.values()]
      .filter(n => n.source.executive === executive)
      .sort((a, b) => b.learnedAt.localeCompare(a.learnedAt));
  }

  /** Search nodes by keyword */
  search(query: string): KnowledgeNode[] {
    const lower = query.toLowerCase();
    const keywords = lower.split(/\s+/).filter(w => w.length > 2);
    return [...this.nodes.values()]
      .filter(n => keywords.some(kw =>
        n.content.toLowerCase().includes(kw) ||
        n.domain.toLowerCase().includes(kw)
      ))
      .sort((a, b) => b.reinforced * b.confidence - a.reinforced * a.confidence)
      .slice(0, 20);
  }

  /** Traverse graph from a node — returns connected nodes up to depth levels */
  traverse(startId: string, depth: number = 2): KnowledgeNode[] {
    const visited = new Set<string>();
    const result: KnowledgeNode[] = [];
    const queue: { id: string; d: number }[] = [{ id: startId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) {
        result.push(node);
        for (const relId of node.relatesTo) {
          queue.push({ id: relId, d: d + 1 });
        }
      }
    }

    return result;
  }

  /** Link two nodes */
  link(sourceId: string, targetId: string): boolean {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    if (!source || !target) return false;
    if (!source.relatesTo.includes(targetId)) {
      source.relatesTo.push(targetId);
    }
    return true;
  }

  /** Auto-link nodes in same domain */
  autoLink(domain: string): number {
    const domainNodes = this.findByDomain(domain);
    let linked = 0;
    for (let i = 0; i < domainNodes.length; i++) {
      for (let j = i + 1; j < domainNodes.length; j++) {
        if (this.link(domainNodes[i].id, domainNodes[j].id)) linked++;
      }
    }
    return linked;
  }

  /** Get all nodes */
  all(): KnowledgeNode[] {
    return [...this.nodes.values()];
  }

  /** Get graph statistics */
  stats() {
    const all = [...this.nodes.values()];
    const domains = new Set(all.map(n => n.domain));
    const types = new Set(all.map(n => n.type));
    const execs = new Set(all.map(n => n.source.executive));
    const totalLinks = all.reduce((sum, n) => sum + n.relatesTo.length, 0);
    return {
      totalNodes: all.length,
      domains: domains.size,
      types: types.size,
      executives: execs.size,
      totalLinks,
      avgReinforced: all.length > 0 ? Math.round(all.reduce((s, n) => s + n.reinforced, 0) / all.length) : 0,
      avgConfidence: all.length > 0 ? Math.round(all.reduce((s, n) => s + n.confidence, 0) / all.length) : 0,
    };
  }
}

export const knowledgeGraph = new KnowledgeGraph();
