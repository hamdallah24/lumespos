import type { ExecutionPlan } from "../execution-planner/core/types";
import { progressTracker } from "../execution-planner/core/ProgressTracker";
import type {
  WorkflowInstance,
  WorkflowStatus,
  WorkflowEvent,
  WorkflowConfig,
  NodeExecutionResult,
  WorkflowEventHandler,
} from "./types";
import { DEFAULT_WORKFLOW_CONFIG } from "./types";
import { executeNode } from "./NodeExecutor";
import { findReadyNodes, allNodesCompleted, anyNodeFailed } from "./WorkflowScheduler";
import { executeRollback } from "./RollbackExecutor";

let instanceCounter = 0;

export class WorkflowEngine {
  private instances = new Map<string, WorkflowInstance>();
  private eventHandlers: WorkflowEventHandler[] = [];
  private runningTimers = new Set<string>();

  on(handler: WorkflowEventHandler): void {
    this.eventHandlers.push(handler);
  }

  off(handler: WorkflowEventHandler): void {
    const idx = this.eventHandlers.indexOf(handler);
    if (idx >= 0) this.eventHandlers.splice(idx, 1);
  }

  startWorkflow(
    plan: ExecutionPlan,
    config?: Partial<WorkflowConfig>,
  ): WorkflowInstance {
    instanceCounter++;

    const id = `wf-${plan.graph.id}-${Date.now()}-${instanceCounter}`;

    progressTracker.register(plan.graph);

    const nodeResults = new Map<string, NodeExecutionResult>();
    for (const node of plan.graph.nodes) {
      nodeResults.set(node.id, {
        nodeId: node.id,
        success: false,
        status: "pending",
        durationMs: 0,
      });
    }

    const instance: WorkflowInstance = {
      id,
      plan,
      status: "running",
      config: { ...DEFAULT_WORKFLOW_CONFIG, ...config },
      nodeResults,
      currentNodeIndex: 0,
      startedAt: new Date(),
      events: [],
    };

    this.instances.set(id, instance);
    this.emit({ type: "workflow.started", instanceId: id, timestamp: new Date() });

    this.dispatchNextNodes(id);

    return instance;
  }

  pauseWorkflow(instanceId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== "running") return false;
    inst.status = "paused";
    this.emit({ type: "workflow.paused", instanceId, timestamp: new Date() });
    return true;
  }

  resumeWorkflow(instanceId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== "paused") return false;
    inst.status = "running";
    this.emit({ type: "workflow.resumed", instanceId, timestamp: new Date() });
    this.dispatchNextNodes(instanceId);
    return true;
  }

  cancelWorkflow(instanceId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status === "completed" || inst.status === "cancelled") return false;
    inst.status = "cancelled";
    inst.completedAt = new Date();
    this.emit({ type: "workflow.cancelled", instanceId, timestamp: new Date() });
    return true;
  }

  approveNode(instanceId: string, nodeId: string, approved: boolean): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst) return false;

    const result = inst.nodeResults.get(nodeId);
    if (!result || result.status !== "pending") return false;

    if (approved) {
      result.status = "completed";
      result.success = true;
      progressTracker.setNodeStatus(inst.plan.graph.id, nodeId, "completed");
      this.emit({ type: "approval.granted", instanceId, nodeId, timestamp: new Date() });
      this.dispatchNextNodes(instanceId);
    } else {
      result.status = "failed";
      result.success = false;
      result.error = "Approval denied";
      progressTracker.setNodeStatus(inst.plan.graph.id, nodeId, "failed");
      this.emit({ type: "approval.denied", instanceId, nodeId, timestamp: new Date() });
      void this.handleNodeFailure(inst, nodeId);
    }

    return true;
  }

  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  getStatus(instanceId: string): WorkflowStatus | undefined {
    return this.instances.get(instanceId)?.status;
  }

  getAllInstances(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }

  clear(): void {
    for (const timer of this.runningTimers) {
      clearTimeout(timer as unknown as number);
    }
    this.runningTimers.clear();
    this.instances.clear();
  }

  private async dispatchNextNodes(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== "running") return;

    const statusMap = this.getStatusMap(inst);

    if (allNodesCompleted(inst.plan, statusMap)) {
      inst.status = "completed";
      inst.completedAt = new Date();
      this.emit({ type: "workflow.completed", instanceId, timestamp: new Date() });
      return;
    }

    if (anyNodeFailed(inst.plan, statusMap)) {
      if (inst.config.autoRollbackOnFailure) {
        await this.doRollback(inst);
      } else {
        inst.status = "failed";
        inst.completedAt = new Date();
        this.emit({ type: "workflow.failed", instanceId, timestamp: new Date() });
      }
      return;
    }

    const readyNodes = findReadyNodes(inst.plan, statusMap);

    for (const rn of readyNodes) {
      if (inst.status !== "running") return;

      const nodeType = rn.node.type;
      if (nodeType === "approval") {
        this.emit({
          type: "approval.required",
          instanceId,
          nodeId: rn.node.id,
          timestamp: new Date(),
        });
        continue;
      }

      inst.currentNodeIndex = rn.index;
      void this.runNode(inst, rn.node);
    }
  }

  private async runNode(inst: WorkflowInstance, node: typeof inst.plan.graph.nodes[0]): Promise<void> {
    progressTracker.setNodeStatus(inst.plan.graph.id, node.id, "in_progress");
    this.emit({ type: "node.started", instanceId: inst.id, nodeId: node.id, timestamp: new Date() });

    const result = await executeNode(node);

    inst.nodeResults.set(node.id, result);
    progressTracker.setNodeStatus(inst.plan.graph.id, node.id, result.status);

    if (result.success) {
      this.emit({ type: "node.completed", instanceId: inst.id, nodeId: node.id, timestamp: new Date(), payload: result.output });
    } else {
      this.emit({ type: "node.failed", instanceId: inst.id, nodeId: node.id, timestamp: new Date(), payload: { error: result.error } });
      await this.handleNodeFailure(inst, node.id);
      return;
    }

    this.dispatchNextNodes(inst.id);
  }

  private async handleNodeFailure(inst: WorkflowInstance, failedNodeId: string): Promise<void> {
    const result = inst.nodeResults.get(failedNodeId);
    const retries = result?.metadata?.["retryCount"] as number ?? 0;

    if (retries < inst.config.maxRetries) {
      const updatedResult = inst.nodeResults.get(failedNodeId);
      if (updatedResult) {
        updatedResult.metadata = { ...updatedResult.metadata, retryCount: retries + 1 };
      }
      progressTracker.setNodeStatus(inst.plan.graph.id, failedNodeId, "pending");

      const timer = setTimeout(() => {
        this.runningTimers.delete(timer as unknown as string);
        void this.runNode(inst, inst.plan.graph.nodes.find((n) => n.id === failedNodeId)!);
      }, inst.config.retryDelayMs);
      this.runningTimers.add(timer as unknown as string);
    } else {
      progressTracker.setNodeStatus(inst.plan.graph.id, failedNodeId, "failed");

      if (inst.config.autoRollbackOnFailure) {
        await this.doRollback(inst);
      } else {
        inst.status = "failed";
        inst.completedAt = new Date();
        inst.error = `Node ${failedNodeId} failed after ${retries} retries`;
        this.emit({ type: "workflow.failed", instanceId: inst.id, timestamp: new Date() });
      }
    }
  }

  private async doRollback(inst: WorkflowInstance): Promise<void> {
    this.emit({ type: "rollback.started", instanceId: inst.id, timestamp: new Date() });

    const completedIds: string[] = [];
    for (const [nodeId, result] of inst.nodeResults) {
      if (result.status === "completed") {
        completedIds.push(nodeId);
      }
    }

    const rollbackResult = await executeRollback(inst.plan, completedIds);

    if (rollbackResult.success) {
      for (const rr of rollbackResult.nodeResults) {
        inst.nodeResults.set(rr.nodeId, rr);
      }
    }

    inst.status = "failed";
    inst.completedAt = new Date();
    inst.error = "Workflow failed — rollback executed";
    this.emit({ type: "rollback.completed", instanceId: inst.id, timestamp: new Date() });
    this.emit({ type: "workflow.failed", instanceId: inst.id, timestamp: new Date() });
  }

  private getStatusMap(inst: WorkflowInstance): Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped"> {
    const map = new Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped">();
    for (const [nodeId, result] of inst.nodeResults) {
      map.set(nodeId, result.status);
    }
    return map;
  }

  private emit(event: WorkflowEvent): void {
    const instance = this.instances.get(event.instanceId);
    if (instance) {
      instance.events.push(event);
    }
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // handler error — non-critical
      }
    }
  }
}

export const workflowEngine = new WorkflowEngine();
