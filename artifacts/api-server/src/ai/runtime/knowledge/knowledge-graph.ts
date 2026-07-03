// ECP-029.5: Semantic Knowledge Graph
// Frozen. Not a vector DB. A relationship graph of knowledge cards.
// Consultant traverses the graph instead of reading all documents.

import type { KnowledgeCard } from "./knowledge-card";

interface GraphNode {
  id: string;
  card: KnowledgeCard;
  edges: { targetId: string; type: "depends_on" | "related_to" | "contradicts" | "supersedes" }[];
}

class KnowledgeGraph {
  private _nodes = new Map<string, GraphNode>();

  addCard(card: KnowledgeCard): void {
    if (this._nodes.has(card.id)) return;

    const node: GraphNode = {
      id: card.id,
      card,
      edges: [],
    };
    this._nodes.set(card.id, node);

    // Build edges from relatedCards
    for (const relatedId of card.relatedCards) {
      node.edges.push({ targetId: relatedId, type: "related_to" });
    }
  }

  /** Traverse graph from a starting node. Returns all connected cards within N hops. */
  traverse(startId: string, maxHops = 3): KnowledgeCard[] {
    const visited = new Set<string>();
    const result: KnowledgeCard[] = [];
    const queue: { id: string; hop: number }[] = [{ id: startId, hop: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.hop > maxHops) continue;
      visited.add(current.id);

      const node = this._nodes.get(current.id);
      if (node) {
        result.push(node.card);
        for (const edge of node.edges) {
          queue.push({ id: edge.targetId, hop: current.hop + 1 });
        }
      }
    }

    return result;
  }

  /** Find cards connected to a topic */
  search(topic: string, maxHops = 2): KnowledgeCard[] {
    const lower = topic.toLowerCase();
    const startIds: string[] = [];

    for (const [, node] of this._nodes) {
      if (node.card.topic.toLowerCase().includes(lower)) {
        startIds.push(node.id);
      }
    }

    const allResults: KnowledgeCard[] = [];
    for (const id of startIds.slice(0, 3)) {
      allResults.push(...this.traverse(id, maxHops));
    }

    return [...new Map(allResults.map(c => [c.id, c])).values()];
  }

  getNode(id: string): GraphNode | undefined { return this._nodes.get(id); }
  getAllNodes(): GraphNode[] { return [...this._nodes.values()]; }
  size(): number { return this._nodes.size; }
}

export const knowledgeGraph = new KnowledgeGraph();
