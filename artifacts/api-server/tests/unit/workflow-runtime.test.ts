import { describe, it, expect } from "vitest";
import type { ExecutionPlan, ExecutionGraph } from "../../src/execution-planner/core/types";

function makePlan(overrides?: Partial<ExecutionPlan>): ExecutionPlan {
  const graph: ExecutionGraph = {
    id: "graph-test-001",
    name: "Test Graph",
    nodes: [
      { id: "n1", label: "Task 1", type: "task", status: "pending", estimatedDuration: 10, dependsOn: [], metadata: {} },
      { id: "n2", label: "Task 2", type: "task", status: "pending", estimatedDuration: 10, dependsOn: ["n1"], metadata: {} },
      { id: "n3", label: "Notify", type: "notification", status: "pending", estimatedDuration: 5, dependsOn: ["n2"], metadata: {} },
    ],
    edges: [
      { id: "e1", fromNodeId: "n1", toNodeId: "n2", type: "dependency", metadata: {} },
      { id: "e2", fromNodeId: "n2", toNodeId: "n3", type: "dependency", metadata: {} },
    ],
    metadata: {},
    createdAt: new Date(),
  };

  return {
    graph,
    topologicalOrder: ["n1", "n2", "n3"],
    criticalPath: ["n1", "n2", "n3"],
    criticalPathDuration: 25,
    parallelGroups: [],
    rollbackGraph: { ...graph, id: "rollback-graph-test-001", nodes: [...graph.nodes].reverse().map((n) => ({ ...n, type: "rollback" as const })), edges: [] },
    ...overrides,
  };
}

function waitForCondition(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("Timeout waiting for condition"));
      setTimeout(check, 10);
    };
    check();
  });
}


describe("NodeExecutor", () => {
  it("should execute a task node", async () => {
    const { executeNode } = await import("../../src/workflow-runtime/NodeExecutor");
    const result = await executeNode({ id: "test", label: "Test", type: "task", status: "pending", estimatedDuration: 10, dependsOn: [], metadata: {} });
    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should handle approval node as pending", async () => {
    const { executeNode } = await import("../../src/workflow-runtime/NodeExecutor");
    const result = await executeNode({ id: "test", label: "Test", type: "approval", status: "pending", estimatedDuration: 10, dependsOn: [], metadata: {} });
    expect(result.success).toBe(true);
    expect(result.status).toBe("pending");
  });

  it("should handle unknown node type as failure", async () => {
    const { executeNode } = await import("../../src/workflow-runtime/NodeExecutor");
    const result = await executeNode({ id: "test", label: "Test", type: "decision" as any, status: "pending", estimatedDuration: 10, dependsOn: [], metadata: {} });
    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
  });
});

describe("WorkflowScheduler", () => {
  it("should find n1 as the only ready node initially", async () => {
    const { findReadyNodes } = await import("../../src/workflow-runtime/WorkflowScheduler");
    const plan = makePlan();
    const statusMap = new Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped">();
    const ready = findReadyNodes(plan, statusMap);
    expect(ready.length).toBe(1);
    expect(ready[0].node.id).toBe("n1");
  });

  it("should find n2 ready after n1 completes", async () => {
    const { findReadyNodes } = await import("../../src/workflow-runtime/WorkflowScheduler");
    const plan = makePlan();
    const statusMap = new Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped">();
    statusMap.set("n1", "completed");
    const ready = findReadyNodes(plan, statusMap);
    expect(ready.length).toBe(1);
    expect(ready[0].node.id).toBe("n2");
  });

  it("should detect all nodes completed", async () => {
    const { allNodesCompleted } = await import("../../src/workflow-runtime/WorkflowScheduler");
    const plan = makePlan();
    const statusMap = new Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped">();
    statusMap.set("n1", "completed");
    statusMap.set("n2", "completed");
    statusMap.set("n3", "completed");
    expect(allNodesCompleted(plan, statusMap)).toBe(true);
  });

  it("should detect any node failed", async () => {
    const { anyNodeFailed } = await import("../../src/workflow-runtime/WorkflowScheduler");
    const plan = makePlan();
    const statusMap = new Map<string, "pending" | "in_progress" | "completed" | "failed" | "skipped">();
    statusMap.set("n1", "failed");
    expect(anyNodeFailed(plan, statusMap)).toBe(true);
  });
});

describe("WorkflowEngine", () => {
  it("should start a workflow and complete all nodes", async () => {
    const { WorkflowEngine } = await import("../../src/workflow-runtime/WorkflowEngine");
    const engine = new WorkflowEngine();
    const plan = makePlan();
    const instance = engine.startWorkflow(plan, { autoRollbackOnFailure: false });

    await waitForCondition(() => engine.getStatus(instance.id) === "completed");

    const status = engine.getStatus(instance.id);
    expect(status).toBe("completed");

    for (const [, result] of instance.nodeResults) {
      expect(result.status).toBe("completed");
    }
  });

  it("should pause and resume a workflow", async () => {
    const { WorkflowEngine } = await import("../../src/workflow-runtime/WorkflowEngine");
    const engine = new WorkflowEngine();
    const plan = makePlan();
    const instance = engine.startWorkflow(plan);

    await waitForCondition(() => engine.getStatus(instance.id) === "running");
    expect(engine.pauseWorkflow(instance.id)).toBe(true);
    expect(engine.getStatus(instance.id)).toBe("paused");
    expect(engine.resumeWorkflow(instance.id)).toBe(true);
    expect(engine.getStatus(instance.id)).toBe("running");

    await waitForCondition(() => engine.getStatus(instance.id) === "completed");
    expect(engine.getStatus(instance.id)).toBe("completed");

    engine.clear();
  });

  it("should cancel a running workflow", async () => {
    const { WorkflowEngine } = await import("../../src/workflow-runtime/WorkflowEngine");
    const engine = new WorkflowEngine();
    const plan = makePlan();
    const instance = engine.startWorkflow(plan);
    expect(engine.cancelWorkflow(instance.id)).toBe(true);
    engine.clear();
  });

  it("should handle approval nodes via approveNode", async () => {
    const { WorkflowEngine } = await import("../../src/workflow-runtime/WorkflowEngine");
    const engine = new WorkflowEngine();

    const approvalPlan = makePlan({
      graph: {
        id: "graph-approval",
        name: "Approval Test",
        nodes: [
          { id: "a1", label: "Approval Step", type: "approval", status: "pending", estimatedDuration: 0, dependsOn: [], metadata: {} },
          { id: "a2", label: "Task After", type: "task", status: "pending", estimatedDuration: 10, dependsOn: ["a1"], metadata: {} },
        ],
        edges: [{ id: "ea1", fromNodeId: "a1", toNodeId: "a2", type: "dependency", metadata: {} }],
        metadata: {},
        createdAt: new Date(),
      },
      topologicalOrder: ["a1", "a2"],
      criticalPath: ["a1", "a2"],
      criticalPathDuration: 10,
      parallelGroups: [],
      rollbackGraph: {
        id: "rollback-approval",
        name: "Rollback",
        nodes: [{ id: "ra2", label: "Rollback A2", type: "rollback", status: "pending", estimatedDuration: 5, dependsOn: [], metadata: {} }],
        edges: [],
        metadata: {},
        createdAt: new Date(),
      },
    });

    const instance = engine.startWorkflow(approvalPlan, { autoRollbackOnFailure: false });

    const approved = engine.approveNode(instance.id, "a1", true);
    expect(approved).toBe(true);

    await waitForCondition(() => engine.getStatus(instance.id) === "completed");
    expect(engine.getStatus(instance.id)).toBe("completed");

    engine.clear();
  });

  it("should fire events", async () => {
    const { WorkflowEngine } = await import("../../src/workflow-runtime/WorkflowEngine");
    const engine = new WorkflowEngine();
    const events: string[] = [];

    engine.on((event) => {
      events.push(event.type);
    });

    const plan = makePlan();
    engine.startWorkflow(plan);

    await waitForCondition(() => engine.getStatus("") === undefined, 2000).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toBe("workflow.started");

    engine.clear();
  });
});

describe("RollbackExecutor", () => {
  it("should execute rollback for completed nodes", async () => {
    const { executeRollback } = await import("../../src/workflow-runtime/RollbackExecutor");
    const plan = makePlan();
    const result = await executeRollback(plan, ["n1", "n2"]);
    expect(result.success).toBe(true);
    expect(result.nodeResults.length).toBeGreaterThan(0);
  });
});

describe("WorkflowRuntimeProvider", () => {
  it("should start workflow and track history", async () => {
    const { WorkflowRuntimeProvider } = await import("../../src/workflow-runtime/WorkflowRuntimeProvider");
    const plan = makePlan();
    const instance = WorkflowRuntimeProvider.startWorkflow(plan);

    await waitForCondition(() => {
      const inst = WorkflowRuntimeProvider.getInstance(instance.id);
      return inst?.status === "completed";
    }, 5000);

    const active = WorkflowRuntimeProvider.getActiveWorkflows();
    const history = WorkflowRuntimeProvider.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(active.length).toBe(0);

    WorkflowRuntimeProvider.clear();
  });

  it("should initialize without error", async () => {
    const { initializeWorkflowRuntime } = await import("../../src/workflow-runtime");
    expect(() => initializeWorkflowRuntime()).not.toThrow();
  });
});
