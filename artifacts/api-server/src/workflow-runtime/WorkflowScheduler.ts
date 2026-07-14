import type { ExecutionPlan, GraphNode, NodeStatus } from "../execution-planner/core/types";

export interface ReadyNode {
  node: GraphNode;
  index: number;
}

export function findReadyNodes(
  plan: ExecutionPlan,
  statusMap: Map<string, NodeStatus>,
): ReadyNode[] {
  const ready: ReadyNode[] = [];

  for (let i = 0; i < plan.topologicalOrder.length; i++) {
    const nodeId = plan.topologicalOrder[i];
    const node = plan.graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const currentStatus = statusMap.get(nodeId) ?? "pending";
    if (currentStatus !== "pending") continue;

    const depsCompleted = node.dependsOn.every((depId) => {
      return statusMap.get(depId) === "completed";
    });

    if (depsCompleted) {
      ready.push({ node, index: i });
    }
  }

  return ready;
}

export function findParallelGroupsFromStatus(
  plan: ExecutionPlan,
  statusMap: Map<string, NodeStatus>,
): GraphNode[][] {
  const groups: GraphNode[][] = [];

  for (const group of plan.parallelGroups) {
    const readyInGroup = group
      .map((id) => plan.graph.nodes.find((n) => n.id === id))
      .filter((n): n is GraphNode => n !== undefined)
      .filter((n) => {
        const s = statusMap.get(n.id) ?? "pending";
        if (s !== "pending") return false;
        return n.dependsOn.every((d) => statusMap.get(d) === "completed");
      });

    if (readyInGroup.length > 0) {
      groups.push(readyInGroup);
    }
  }

  return groups;
}

export function allNodesCompleted(
  plan: ExecutionPlan,
  statusMap: Map<string, NodeStatus>,
): boolean {
  return plan.graph.nodes.every((n) => {
    const s = statusMap.get(n.id) ?? "pending";
    return s === "completed" || s === "skipped";
  });
}

export function anyNodeFailed(
  plan: ExecutionPlan,
  statusMap: Map<string, NodeStatus>,
): boolean {
  return plan.graph.nodes.some((n) => {
    return statusMap.get(n.id) === "failed";
  });
}
