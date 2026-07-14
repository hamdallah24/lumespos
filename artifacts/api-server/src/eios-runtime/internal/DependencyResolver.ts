import type { ComponentId } from "../contracts/ComponentId";
import { formatComponentId } from "../contracts/ComponentId";
import { PipelineStageRegistry } from "./runtime-metadata/PipelineStageRegistry";
import { ObserverRegistry } from "./runtime-metadata/ObserverRegistry";
import { CapabilityRegistry } from "./runtime-metadata/CapabilityRegistry";
import { ExecutiveRegistry } from "./runtime-metadata/ExecutiveRegistry";
import { EventRegistry } from "./runtime-metadata/EventRegistry";
import { PipelineGraphRegistry } from "./runtime-metadata/PipelineGraphRegistry";

interface DependencyEdge {
  from: string;
  to: string;
  type: "stage" | "capability" | "plugin" | "executive" | "observer_event";
}

const edges: DependencyEdge[] = [];

function collectAllNodes(): string[] {
  const nodes = new Set<string>();
  for (const s of PipelineStageRegistry.getAll()) nodes.add(formatComponentId(s.id));
  for (const o of ObserverRegistry.getAll()) nodes.add(formatComponentId(o.id));
  for (const c of CapabilityRegistry.getAll()) nodes.add(formatComponentId(c.id));
  for (const e of ExecutiveRegistry.getAll()) nodes.add(formatComponentId(e.id));
  return Array.from(nodes);
}

function detectCycles(edgeList: DependencyEdge[]): string[][] {
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

function topologicalSort(edgeList: DependencyEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const e of edgeList) {
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

export const DependencyResolver = {
  resolveAll(): { success: boolean; cycles: string[][] } {
    edges.length = 0;
    this.resolveStageDependencies();
    this.resolveCapabilityDependencies();
    this.resolveExecutiveDependencies();
    this.resolveObserverEventDependencies();

    const cycles = this.detectCrossModuleCycles();
    return { success: cycles.length === 0, cycles };
  },

  resolveStageDependencies(): void {
    for (const stage of PipelineStageRegistry.getAll()) {
      for (const dep of stage.manifest.dependencies) {
        if (dep.type === "stage") {
          edges.push({ from: formatComponentId(stage.id), to: formatComponentId(dep), type: "stage" });
        } else {
          const cap = CapabilityRegistry.get(dep);
          if (cap) {
            edges.push({ from: formatComponentId(stage.id), to: formatComponentId(cap.id), type: "capability" });
          }
        }
      }
    }
  },

  resolveCapabilityDependencies(): void {
    for (const cap of CapabilityRegistry.getAll()) {
      edges.push({ from: formatComponentId(cap.id), to: formatComponentId(cap.provider), type: "capability" });
    }
  },

  resolveExecutiveDependencies(): void {
    for (const exec of ExecutiveRegistry.getAll()) {
      for (const dep of exec.manifest.dependencies) {
        edges.push({ from: formatComponentId(exec.id), to: formatComponentId(dep), type: "executive" });
      }
    }
  },

  resolveObserverEventDependencies(): void {
    for (const obs of ObserverRegistry.getAll()) {
      const eventEntries = EventRegistry.getAll();
      const matched = eventEntries.find(e => e.id.name === obs.subscribe);
      if (matched) {
        edges.push({ from: formatComponentId(obs.id), to: formatComponentId(matched.id), type: "observer_event" });
      }
    }
  },

  buildConstructionGraph(): ComponentId[] {
    const allNodes = collectAllNodes();
    const sorted = topologicalSort(edges);
    const result: ComponentId[] = [];
    const added = new Set<string>();

    for (const key of sorted) {
      if (added.has(key)) continue;
      added.add(key);
      const parts = key.split(":");
      if (parts.length >= 3) {
        const namePart = parts[2].split("@")[0];
        const stage = PipelineStageRegistry.getAll().find(s =>
          s.id.namespace === parts[0] && s.id.name === namePart
        );
        if (stage) { result.push(stage.id); continue; }
        const cap = CapabilityRegistry.getAll().find(c =>
          c.id.namespace === parts[0] && c.id.name === namePart
        );
        if (cap) { result.push(cap.id); continue; }
      }
    }

    return result;
  },

  detectCrossModuleCycles(): string[][] {
    return detectCycles(edges);
  },

  getEdgeCount(): number {
    return edges.length;
  },

  clear(): void {
    edges.length = 0;
  },
};
