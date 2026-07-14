import type { ExecutionGraph, GraphNode, GraphEdge } from "./types";

export function buildRollbackGraph(forward: ExecutionGraph): ExecutionGraph {
  const rollbackNodes: GraphNode[] = forward.nodes.map((n) => ({
    ...n,
    id: `rollback-${n.id}`,
    label: `[Rollback] ${n.label}`,
    type: "rollback" as const,
    status: "pending" as const,
    dependsOn: [],
  }));

  const nodeIdMap = new Map(
    forward.nodes.map((n, i) => [n.id, rollbackNodes[i].id]),
  );

  const rollbackEdges: GraphEdge[] = forward.edges
    .filter((e) => e.type === "dependency")
    .map((e) => ({
      id: `rb-edge-${e.id}`,
      fromNodeId: nodeIdMap.get(e.toNodeId) ?? `rollback-${e.toNodeId}`,
      toNodeId: nodeIdMap.get(e.fromNodeId) ?? `rollback-${e.fromNodeId}`,
      type: "rollback" as const,
      metadata: {},
    }));

  return {
    id: `rollback-${forward.id}`,
    name: `Rollback: ${forward.name}`,
    nodes: rollbackNodes,
    edges: rollbackEdges,
    metadata: { originalGraphId: forward.id },
    createdAt: new Date(),
    branchId: forward.branchId,
  };
}
