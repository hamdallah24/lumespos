import type { ExecutionPlan, GraphNode, NodeStatus } from "../execution-planner/core/types";

export type WorkflowStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.paused"
  | "workflow.resumed"
  | "workflow.cancelled"
  | "node.started"
  | "node.completed"
  | "node.failed"
  | "node.skipped"
  | "approval.required"
  | "approval.granted"
  | "approval.denied"
  | "rollback.started"
  | "rollback.completed";

export interface WorkflowEvent {
  type: WorkflowEventType;
  instanceId: string;
  nodeId?: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

export interface WorkflowConfig {
  maxRetries: number;
  retryDelayMs: number;
  autoRollbackOnFailure: boolean;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
  autoRollbackOnFailure: true,
};

export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  status: NodeStatus;
  durationMs: number;
  error?: string;
  output?: Record<string, unknown>;
}

export interface WorkflowInstance {
  id: string;
  plan: ExecutionPlan;
  status: WorkflowStatus;
  config: WorkflowConfig;
  nodeResults: Map<string, NodeExecutionResult>;
  currentNodeIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  events: WorkflowEvent[];
}
