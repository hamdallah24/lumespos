import type { GraphNode, NodeStatus } from "../execution-planner/core/types";
import type { NodeExecutionResult } from "./types";

type NodeHandler = (node: GraphNode) => Promise<NodeExecutionResult>;

const SIMULATED_DURATION_MS = 50;

const nodeHandlers: Record<string, NodeHandler> = {
  task: async (node) => {
    await delay(SIMULATED_DURATION_MS);
    return {
      nodeId: node.id,
      success: true,
      status: "completed",
      durationMs: SIMULATED_DURATION_MS,
      output: { executed: true, label: node.label },
    };
  },

  approval: async (node) => {
    return {
      nodeId: node.id,
      success: true,
      status: "pending",
      durationMs: 0,
      output: { requiresApproval: true, label: node.label },
    };
  },

  notification: async (node) => {
    await delay(SIMULATED_DURATION_MS);
    return {
      nodeId: node.id,
      success: true,
      status: "completed",
      durationMs: SIMULATED_DURATION_MS,
      output: { notified: true, label: node.label },
    };
  },

  decision: async (node) => {
    await delay(SIMULATED_DURATION_MS);
    return {
      nodeId: node.id,
      success: true,
      status: "completed",
      durationMs: SIMULATED_DURATION_MS,
      output: { decided: true, label: node.label },
    };
  },

  rollback: async (node) => {
    await delay(SIMULATED_DURATION_MS);
    return {
      nodeId: node.id,
      success: true,
      status: "completed",
      durationMs: SIMULATED_DURATION_MS,
      output: { rolledBack: true, label: node.label },
    };
  },
};

export async function executeNode(node: GraphNode): Promise<NodeExecutionResult> {
  const handler = nodeHandlers[node.type];
  if (!handler) {
    return {
      nodeId: node.id,
      success: false,
      status: "failed",
      durationMs: 0,
      error: `No handler for node type: ${node.type}`,
    };
  }

  const start = Date.now();
  try {
    const result = await handler(node);
    result.durationMs = Date.now() - start;
    return result;
  } catch (e: unknown) {
    return {
      nodeId: node.id,
      success: false,
      status: "failed",
      durationMs: Date.now() - start,
      error: String(e),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
