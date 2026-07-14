import type { ExecutionGraph, GraphNode, NodeStatus } from "./types";

export interface ProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  pending: number;
  skipped: number;
  percentComplete: number;
}

export class ProgressTracker {
  private graphs = new Map<string, ExecutionGraph>();

  register(graph: ExecutionGraph): void {
    this.graphs.set(graph.id, graph);
  }

  getGraph(id: string): ExecutionGraph | undefined {
    return this.graphs.get(id);
  }

  setNodeStatus(graphId: string, nodeId: string, status: NodeStatus): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    node.status = status;
    return true;
  }

  getSummary(graphId: string): ProgressSummary | null {
    const graph = this.graphs.get(graphId);
    if (!graph) return null;

    const nodes = graph.nodes;
    const completed = nodes.filter(n => n.status === "completed").length;
    const inProgress = nodes.filter(n => n.status === "in_progress").length;
    const failed = nodes.filter(n => n.status === "failed").length;
    const pending = nodes.filter(n => n.status === "pending").length;
    const skipped = nodes.filter(n => n.status === "skipped").length;

    return {
      total: nodes.length,
      completed,
      inProgress,
      failed,
      pending,
      skipped,
      percentComplete: nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0,
    };
  }

  canExecute(graphId: string, nodeId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    if (node.status !== "pending") return false;
    for (const dep of node.dependsOn) {
      const depNode = graph.nodes.find(n => n.id === dep);
      if (!depNode || depNode.status !== "completed") return false;
    }
    return true;
  }

  getAllGraphs(): ExecutionGraph[] {
    return Array.from(this.graphs.values());
  }

  clear(): void {
    this.graphs.clear();
  }
}

export const progressTracker = new ProgressTracker();
