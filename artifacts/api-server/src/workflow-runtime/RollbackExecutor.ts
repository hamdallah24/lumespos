import type { ExecutionPlan, GraphNode, NodeStatus } from "../execution-planner/core/types";
import type { NodeExecutionResult } from "./types";
import { executeNode } from "./NodeExecutor";

export interface RollbackResult {
  success: boolean;
  nodeResults: NodeExecutionResult[];
  error?: string;
}

export async function executeRollback(
  plan: ExecutionPlan,
  completedNodeIds: string[],
): Promise<RollbackResult> {
  const rollbackNodes = getRollbackOrder(plan, completedNodeIds);
  const results: NodeExecutionResult[] = [];

  for (const node of rollbackNodes) {
    try {
      const result = await executeNode(node);
      results.push(result);
      if (!result.success) {
        return {
          success: false,
          nodeResults: results,
          error: `Rollback failed at node: ${node.id}`,
        };
      }
    } catch (e: unknown) {
      return {
        success: false,
        nodeResults: results,
        error: `Rollback error at node ${node.id}: ${String(e)}`,
      };
    }
  }

  return { success: true, nodeResults: results };
}

function getRollbackOrder(
  plan: ExecutionPlan,
  completedNodeIds: string[],
): GraphNode[] {
  const completedSet = new Set(completedNodeIds);
  const rollbackGraph = plan.rollbackGraph;

  const rollbackNodes = rollbackGraph.nodes.filter((n) => {
    if (n.type !== "rollback") return false;
    if (n.metadata["originalNodeId"] as string) {
      return completedSet.has(n.metadata["originalNodeId"] as string);
    }
    const match = n.id.match(/^rollback-(.+)$/);
    if (match) return completedSet.has(match[1]);
    return false;
  });

  if (rollbackNodes.length > 0) {
    return topologicalSortRollback(rollbackGraph).filter((n) =>
      rollbackNodes.some((r) => r.id === n.id),
    );
  }

  const forwardNodes = plan.graph.nodes.filter((n) => completedSet.has(n.id));
  return [...forwardNodes].reverse();
}

function topologicalSortRollback(graph: typeof import("../execution-planner/core/types").ExecutionGraph): GraphNode[] {
  const visited = new Set<string>();
  const result: GraphNode[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    for (const dep of node.dependsOn) {
      visit(dep);
    }
    const found = graph.nodes.find((n) => n.id === nodeId);
    if (found) result.push(found);
  }

  for (const node of graph.nodes) {
    visit(node.id);
  }

  return result;
}
