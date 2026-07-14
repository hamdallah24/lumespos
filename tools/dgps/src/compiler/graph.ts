import type { DocumentSource, DependencyGraph, GraphEdge, EdgeType } from "../types/index.js";

export function buildDependencyGraph(sources: DocumentSource[]): DependencyGraph {
  const nodes: DependencyGraph["nodes"] = {};
  const edges: GraphEdge[] = [];
  const idSet = new Set(sources.map(s => s.id));

  for (const src of sources) {
    nodes[src.id] = {
      depends_on: src.dependencies,
      inherits: src.inherits,
      consumers: src.consumer,
    };

    // depends_on edges
    for (const dep of src.dependencies) {
      if (idSet.has(dep)) {
        edges.push({ from: src.id, to: dep, type: "depends_on" });
      }
    }

    // inherits edges
    for (const inh of src.inherits) {
      if (idSet.has(inh)) {
        edges.push({ from: src.id, to: inh, type: "inherits" });
      }
    }

    // consumes edges (from consumer field referencing runtime components)
    for (const cons of src.consumer) {
      if (idSet.has(cons)) {
        edges.push({ from: src.id, to: cons, type: "consumes" });
      } else if (cons.endsWith("-runtime") || cons.endsWith("-runtime")) {
        edges.push({ from: src.id, to: cons, type: "consumes" });
      }
    }
  }

  return { nodes, edges };
}

export function topoSort(graph: DependencyGraph): string[] {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const result: string[] = [];

  function visit(node: string) {
    if (inStack.has(node)) return;
    if (visited.has(node)) return;
    inStack.add(node);
    for (const edge of graph.edges) {
      if (edge.to === node && edge.type === "depends_on") {
        visit(edge.from);
      }
    }
    inStack.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of Object.keys(graph.nodes)) visit(node);
  return result;
}
