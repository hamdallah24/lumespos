export * from "./types";
export { WorkflowRuntimeProvider } from "./WorkflowRuntimeProvider";
export { WorkflowEngine, workflowEngine } from "./WorkflowEngine";
export { executeNode } from "./NodeExecutor";
export { findReadyNodes, findParallelGroupsFromStatus, allNodesCompleted, anyNodeFailed } from "./WorkflowScheduler";
export { executeRollback } from "./RollbackExecutor";

let initialized = false;

export function initializeWorkflowRuntime(): void {
  if (initialized) return;
  initialized = true;
  console.log("[WR] Workflow Runtime active — Plan → Execution → Rollback pipeline ready");
}
