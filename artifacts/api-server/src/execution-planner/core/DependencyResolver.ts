import type { GraphNode } from "./types";

export function topologicalSort(nodes: GraphNode[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }

  for (const n of nodes) {
    for (const dep of n.dependsOn) {
      adjacency.get(dep)?.push(n.id);
      inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return result;
}

export function detectCycle(nodes: GraphNode[]): string | null {
  const sorted = topologicalSort(nodes);
  if (sorted.length !== nodes.length) {
    const sortedSet = new Set(sorted);
    const cyclic = nodes.find(n => !sortedSet.has(n.id));
    return cyclic ? `Cycle detected involving node: ${cyclic.id} (${cyclic.label})` : "Cycle detected";
  }
  return null;
}
