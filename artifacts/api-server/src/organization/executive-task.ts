// ECP-042: Executive Task — Standard task format for organization
// Semua executive menerima format identik. Tidak ada format khusus per role.

import type { Finding } from "../runtime/EvidenceTypes";

export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CHRO" | "CIO" | "CLO" | "CSO";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus = "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED";

export interface ExecutiveTask {
  id: string;
  title: string;
  objective: string;
  requestedBy: ExecutiveRole;
  assignedTo: ExecutiveRole[];
  priority: TaskPriority;
  deadline?: Date;
  dependencies: string[];
  status: TaskStatus;
  deliverable: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExecutiveResult {
  taskId: string;
  executive: ExecutiveRole;
  status: "COMPLETED" | "FAILED";
  content: string;
  confidence: number;
  durationMs: number;
  error?: string;
  findings?: Finding[];  // ECP-014R: structured findings (non-breaking)
}

let _counter = 0;

export function createTask(
  title: string,
  objective: string,
  requestedBy: ExecutiveRole,
  assignedTo: ExecutiveRole[],
  priority: TaskPriority = "MEDIUM",
  dependencies: string[] = [],
  deliverable: string = "Report",
): ExecutiveTask {
  _counter++;
  return {
    id: `TASK-${Date.now().toString(36)}-${_counter}`,
    title,
    objective,
    requestedBy,
    assignedTo,
    priority,
    dependencies,
    status: "PENDING",
    deliverable,
    createdAt: new Date().toISOString(),
  };
}
