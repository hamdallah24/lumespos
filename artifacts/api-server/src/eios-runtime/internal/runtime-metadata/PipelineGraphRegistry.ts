import type { ComponentId } from "../../contracts";
import { formatComponentId, parseComponentId } from "../../contracts/ComponentId";
import type { PipelineContext } from "../../contracts/PipelineContracts";

interface GraphEdge {
  from: string;
  to: string;
  condition?: (ctx: PipelineContext) => boolean;
}

const edges: GraphEdge[] = [];

function topologicalSort(filtered: GraphEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const e of filtered) {
    if (!inDegree.has(e.from)) inDegree.set(e.from, 0);
    if (!inDegree.has(e.to)) inDegree.set(e.to, 0);
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of adj.get(node) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return result;
}

function detectCycles(edgeList: GraphEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  const allNodes = new Set<string>();

  for (const e of edgeList) {
    allNodes.add(e.from);
    allNodes.add(e.to);
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const cycles: string[][] = [];
  const path: string[] = [];

  for (const n of allNodes) color.set(n, WHITE);

  function dfs(node: string): void {
    color.set(node, GRAY);
    path.push(node);
    for (const neighbor of adj.get(node) || []) {
      if (color.get(neighbor) === GRAY) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      } else if (color.get(neighbor) === WHITE) {
        dfs(neighbor);
      }
    }
    path.pop();
    color.set(node, BLACK);
  }

  for (const n of allNodes) {
    if (color.get(n) === WHITE) dfs(n);
  }

  return cycles;
}

export const PipelineGraphRegistry = {
  addEdge(from: ComponentId, to: ComponentId, condition?: (ctx: PipelineContext) => boolean): void {
    edges.push({ from: formatComponentId(from), to: formatComponentId(to), condition });
  },

  dependsOn(from: ComponentId, to: ComponentId, condition?: (ctx: PipelineContext) => boolean): void {
    this.addEdge(from, to, condition);
  },

  getExecutionOrder(ctx: PipelineContext): ComponentId[] {
    const filtered = edges.filter(e => !e.condition || e.condition(ctx));
    const sorted = topologicalSort(filtered);
    return sorted.map(s => parseComponentId(s));
  },

  getExecutionOrderForIds(ids: string[], ctx: PipelineContext): ComponentId[] {
    const filtered = edges.filter(e =>
      ids.includes(e.from) && ids.includes(e.to) &&
      (!e.condition || e.condition(ctx))
    );
    const sorted = topologicalSort(filtered);
    const allNodes = new Set(ids);
    for (const s of sorted) allNodes.add(s);
    return Array.from(allNodes).map(s => parseComponentId(s));
  },

  validate(): { cyclic: boolean; missing: string[]; cycles: string[][] } {
    const cycles = detectCycles(edges);
    return {
      cyclic: cycles.length > 0,
      missing: [],
      cycles,
    };
  },

  clear(): void {
    edges.length = 0;
  },
};
