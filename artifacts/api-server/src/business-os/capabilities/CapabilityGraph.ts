import type { CapabilityGraphNode, CapabilityGraphEdge } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";

export function buildGraph(): { nodes: CapabilityGraphNode[]; edges: CapabilityGraphEdge[] } {
  const nodes: CapabilityGraphNode[] = CapabilityRegistry.getAllCapabilities().map(cap => ({
    capabilityId: cap.id,
    name: cap.name,
    domain: cap.domain,
    ownerExecutive: cap.ownerExecutive,
  }));

  const edges: CapabilityGraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const cap of CapabilityRegistry.getAllCapabilities()) {
    for (const dep of cap.dependencies) {
      const key = `${cap.id}->${dep}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: cap.id, to: dep, type: "depends_on" });
      }
    }
  }

  return { nodes, edges };
}

export function getUpstream(capabilityId: string): CapabilityGraphNode[] {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return [];
  return cap.dependencies
    .map(id => CapabilityRegistry.getCapabilityById(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .map(c => ({ capabilityId: c.id, name: c.name, domain: c.domain, ownerExecutive: c.ownerExecutive }));
}

export function getDownstream(capabilityId: string): CapabilityGraphNode[] {
  return CapabilityRegistry.getAllCapabilities()
    .filter(c => c.dependencies.includes(capabilityId))
    .map(c => ({ capabilityId: c.id, name: c.name, domain: c.domain, ownerExecutive: c.ownerExecutive }));
}

export function getDependencyTree(capabilityId: string): { node: CapabilityGraphNode; upstream: CapabilityGraphNode[]; downstream: CapabilityGraphNode[] } | null {
  const cap = CapabilityRegistry.getCapabilityById(capabilityId);
  if (!cap) return null;

  return {
    node: { capabilityId: cap.id, name: cap.name, domain: cap.domain, ownerExecutive: cap.ownerExecutive },
    upstream: getUpstream(capabilityId),
    downstream: getDownstream(capabilityId),
  };
}

export function detectCircularDependencies(): string[][] {
  const allCaps = CapabilityRegistry.getAllCapabilities();
  const cycles: string[][] = [];

  function dfs(currentId: string, path: string[], visited: Set<string>, recursionStack: Set<string>): void {
    visited.add(currentId);
    recursionStack.add(currentId);

    const cap = CapabilityRegistry.getCapabilityById(currentId);
    if (cap) {
      for (const dep of cap.dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path, dep], visited, recursionStack);
        } else if (recursionStack.has(dep)) {
          const cycle = [...path.slice(path.indexOf(dep)), dep];
          cycles.push(cycle);
        }
      }
    }

    recursionStack.delete(currentId);
  }

  for (const cap of allCaps) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    if (!visited.has(cap.id)) {
      dfs(cap.id, [cap.id], visited, recursionStack);
    }
  }

  return cycles;
}

export function getIsolatedCapabilities(): string[] {
  return CapabilityRegistry.getAllCapabilities()
    .filter(cap => cap.dependencies.length === 0 && getDownstream(cap.id).length === 0)
    .map(c => c.id);
}

export function getLeafCapabilities(): string[] {
  return CapabilityRegistry.getAllCapabilities()
    .filter(cap => getDownstream(cap.id).length === 0)
    .map(c => c.id);
}

export function getRootCapabilities(): string[] {
  return CapabilityRegistry.getAllCapabilities()
    .filter(cap => cap.dependencies.length === 0)
    .map(c => c.id);
}

export function getCriticalPath(capabilityId: string): string[] {
  const chain = new Set<string>();
  function traverse(id: string): void {
    const cap = CapabilityRegistry.getCapabilityById(id);
    if (!cap || chain.has(id)) return;
    chain.add(id);
    for (const dep of cap.dependencies) {
      traverse(dep);
    }
  }
  traverse(capabilityId);
  return Array.from(chain);
}

export function hasCycles(): boolean {
  return detectCircularDependencies().length > 0;
}

export function getGraphStats(): Record<string, unknown> {
  const { nodes, edges } = buildGraph();
  const cycles = detectCircularDependencies();
  return {
    totalCapabilities: nodes.length,
    totalDependencies: edges.length,
    cyclesDetected: cycles.length,
    cyclePaths: cycles,
    isolated: getIsolatedCapabilities().length,
    roots: getRootCapabilities().length,
    leaves: getLeafCapabilities().length,
  };
}
