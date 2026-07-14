export type NodeStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export type NodeType = "task" | "approval" | "notification" | "decision" | "rollback";

export type EdgeType = "dependency" | "rollback";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  estimatedDuration: number;
  dependsOn: string[];
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: EdgeType;
  metadata: Record<string, unknown>;
}

export interface ExecutionGraph {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  branchId?: number;
}

export interface ExecutionPlan {
  graph: ExecutionGraph;
  topologicalOrder: string[];
  criticalPath: string[];
  criticalPathDuration: number;
  parallelGroups: string[][];
  rollbackGraph: ExecutionGraph;
}
