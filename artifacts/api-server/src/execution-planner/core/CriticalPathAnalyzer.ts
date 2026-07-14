import type { GraphNode } from "./types";
import { topologicalSort } from "./DependencyResolver";

export function findCriticalPath(nodes: GraphNode[]): {
  path: string[];
  duration: number;
} {
  const order = topologicalSort(nodes);
  if (order.length === 0) return { path: [], duration: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const id of order) {
    dist.set(id, nodes.find(n => n.id === id)?.estimatedDuration ?? 0);
    prev.set(id, null);
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const dep of node.dependsOn) {
      const newDist = (dist.get(dep) ?? 0) + (dist.get(id) ?? 0);
      if (newDist > (dist.get(id) ?? 0)) {
        dist.set(id, newDist);
        prev.set(id, dep);
      }
    }
  }

  let maxDist = 0;
  let endNode = order[0];
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = id;
    }
  }

  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return { path, duration: maxDist };
}
