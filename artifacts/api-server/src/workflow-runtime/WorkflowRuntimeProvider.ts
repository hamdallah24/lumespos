import type { ExecutionPlan } from "../execution-planner/core/types";
import type { WorkflowInstance, WorkflowConfig, WorkflowStatus, WorkflowEventHandler } from "./types";
import { workflowEngine } from "./WorkflowEngine";

const workflowHistory: WorkflowInstance[] = [];
const MAX_HISTORY = 200;

export const WorkflowRuntimeProvider = {
  startWorkflow(plan: ExecutionPlan, config?: Partial<WorkflowConfig>): WorkflowInstance {
    const instance = workflowEngine.startWorkflow(plan, config);
    addToHistory(instance);
    return instance;
  },

  pause(instanceId: string): boolean {
    return workflowEngine.pauseWorkflow(instanceId);
  },

  resume(instanceId: string): boolean {
    return workflowEngine.resumeWorkflow(instanceId);
  },

  cancel(instanceId: string): boolean {
    return workflowEngine.cancelWorkflow(instanceId);
  },

  approveNode(instanceId: string, nodeId: string, approved: boolean): boolean {
    return workflowEngine.approveNode(instanceId, nodeId, approved);
  },

  getInstance(instanceId: string): WorkflowInstance | undefined {
    return workflowEngine.getInstance(instanceId);
  },

  getStatus(instanceId: string): WorkflowStatus | undefined {
    return workflowEngine.getStatus(instanceId);
  },

  getHistory(): WorkflowInstance[] {
    return [...workflowHistory];
  },

  getActiveWorkflows(): WorkflowInstance[] {
    return workflowEngine.getAllInstances().filter(
      (i) => i.status === "running" || i.status === "paused",
    );
  },

  on(handler: WorkflowEventHandler): void {
    workflowEngine.on(handler);
  },

  off(handler: WorkflowEventHandler): void {
    workflowEngine.off(handler);
  },

  clear(): void {
    workflowEngine.clear();
    workflowHistory.length = 0;
  },
};

function addToHistory(instance: WorkflowInstance): void {
  workflowHistory.unshift(instance);
  if (workflowHistory.length > MAX_HISTORY) {
    workflowHistory.length = MAX_HISTORY;
  }
}
