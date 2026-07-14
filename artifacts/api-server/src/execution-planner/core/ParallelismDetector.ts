import type { GraphNode } from "./types";
import { topologicalSort } from "./DependencyResolver";

export function findParallelGroups(nodes: GraphNode[]): string[][] {
  const order = topologicalSort(nodes);
  if (order.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const level = new Map<string, number>();

  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) continue;
    if (node.dependsOn.length === 0) {
      level.set(id, 0);
    } else {
      const maxDepLevel = Math.max(...node.dependsOn.map(d => level.get(d) ?? 0));
      level.set(id, maxDepLevel + 1);
    }
  }

  const groups = new Map<number, string[]>();
  for (const [id, l] of level) {
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(id);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([, ids]) => ids);
}
