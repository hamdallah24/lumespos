import type { StrategicObjective } from "../../strategy-engine/core/types";
import type { ExecutionGraph, GraphNode, GraphEdge } from "./types";
import { detectCycle } from "./DependencyResolver";

export function buildGraph(objective: StrategicObjective): ExecutionGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let nodeCounter = 0;

  function addNode(
    label: string,
    type: GraphNode["type"],
    dependsOn: string[] = [],
    duration: number = 30,
    metadata: Record<string, unknown> = {},
  ): string {
    const id = `node-${nodeCounter++}`;
    nodes.push({
      id, label, type,
      status: "pending",
      estimatedDuration: duration,
      dependsOn,
      metadata,
    });
    return id;
  }

  function addEdge(from: string, to: string): void {
    edges.push({
      id: `edge-${from}-${to}`,
      fromNodeId: from, toNodeId: to,
      type: "dependency",
      metadata: {},
    });
  }

  const analyze = addNode("Analisis situasi", "task", [], 15);
  const defineKPI = addNode("Tentukan target KPI", "task", [analyze], 20);

  const prevNodes: string[] = [defineKPI];
  const kpiNodes: string[] = [];

  for (const kpi of objective.kpiTargets) {
    const kpiNode = addNode(
      `Capai target ${kpi.metric}: ${kpi.currentValue} → ${kpi.targetValue} ${kpi.unit}`,
      "task",
      [defineKPI],
      kpi.targetValue > 100 ? 60 : 30,
      { metric: kpi.metric, currentValue: kpi.currentValue, targetValue: kpi.targetValue },
    );
    kpiNodes.push(kpiNode);
    addEdge(defineKPI, kpiNode);
  }

  const approvalNode = addNode("Approval strategi", "approval", [...prevNodes, ...kpiNodes], 120);
  for (const n of [...prevNodes, ...kpiNodes]) {
    addEdge(n, approvalNode);
  }

  const execute = addNode("Eksekusi strategi", "task", [approvalNode], objective.kpiTargets.length * 30);
  addEdge(approvalNode, execute);

  const monitor = addNode("Monitor progress", "notification", [execute], objective.kpiTargets.length * 15);
  addEdge(execute, monitor);

  const report = addNode("Laporan hasil", "notification", [monitor], 10);
  addEdge(monitor, report);

  const graph: ExecutionGraph = {
    id: `graph-${objective.id}`,
    name: `Execution: ${objective.title}`,
    nodes,
    edges,
    metadata: {
      sourceStrategyId: objective.id,
      direction: objective.direction,
      domain: objective.domain,
    },
    createdAt: new Date(),
    branchId: objective.branchId,
  };

  const cycle = detectCycle(nodes);
  if (cycle) {
    console.error(`[GraphBuilder] ${cycle}`);
  }

  return graph;
}
