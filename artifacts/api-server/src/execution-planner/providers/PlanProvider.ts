import type { StrategicObjective } from "../../strategy-engine/core/types";
import type { ExecutionPlan, ExecutionGraph } from "../core/types";
import { buildGraph, topologicalSort, findCriticalPath, findParallelGroups, buildRollbackGraph, progressTracker } from "../core";
import { createGraphByTemplate } from "../templates";
const planStore: ExecutionPlan[] = [];
const MAX_PLANS = 500;

function buildPlan(graph: ExecutionGraph): ExecutionPlan {
  const order = topologicalSort(graph.nodes);
  const critical = findCriticalPath(graph.nodes);
  const parallelGroups = findParallelGroups(graph.nodes);
  const rollbackGraph = buildRollbackGraph(graph);

  progressTracker.register(graph);

  return {
    graph,
    topologicalOrder: order,
    criticalPath: critical.path,
    criticalPathDuration: critical.duration,
    parallelGroups,
    rollbackGraph,
  };
}

export const PlanProvider = {
  createFromObjective(objective: StrategicObjective): ExecutionPlan {
    const graph = buildGraph(objective);
    const plan = buildPlan(graph);
    planStore.unshift(plan);
    if (planStore.length > MAX_PLANS) planStore.length = MAX_PLANS;
    return plan;
  },

  createFromTemplate(templateName: string, branchId?: number): ExecutionPlan {
    const graph = createGraphByTemplate(templateName, branchId);
    const plan = buildPlan(graph);
    planStore.unshift(plan);
    if (planStore.length > MAX_PLANS) planStore.length = MAX_PLANS;
    return plan;
  },

  getAll(): ExecutionPlan[] {
    return [...planStore];
  },

  getById(id: string): ExecutionPlan | undefined {
    return planStore.find(p => p.graph.id === id);
  },

  getByBranch(branchId: number): ExecutionPlan[] {
    return planStore.filter(p => p.graph.branchId === branchId);
  },

  getByTemplate(template: string): ExecutionPlan[] {
    return planStore.filter(p => p.graph.metadata.template === template);
  },

  updateNodeStatus(graphId: string, nodeId: string, status: string): boolean {
    return progressTracker.setNodeStatus(graphId, nodeId, status as any);
  },

  getProgress(graphId: string) {
    return progressTracker.getSummary(graphId);
  },

  clear(): void {
    planStore.length = 0;
    progressTracker.clear();
  },
};
