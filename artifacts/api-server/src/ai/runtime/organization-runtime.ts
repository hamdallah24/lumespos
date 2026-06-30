// SPRINT 14: Organization Runtime — hierarchical delegation
// CEO delegates to CTO/COO. Agents execute tasks, not negotiate prompts.

import type { AgentIdentity } from "./identity";

export interface DelegatedTask {
  id: string;
  from: string;             // Delegating agent
  to: string;               // Target agent
  task: string;             // What to do
  priority: "low" | "normal" | "high" | "critical";
  deadline?: string;        // ISO timestamp
  requiresApproval: boolean;
  status: "pending" | "accepted" | "in_progress" | "completed" | "rejected";
  result?: string;
  createdAt: string;
}

const _taskQueue: DelegatedTask[] = [];
const _completedTasks: DelegatedTask[] = [];
let _taskCounter = 0;

/** Delegate a task from one agent to another */
export function delegate(
  from: AgentIdentity,
  to: AgentIdentity,
  task: string,
  priority: DelegatedTask["priority"] = "normal",
): DelegatedTask {
  if (from.role === to.role && from.id === to.id) {
    throw new Error("Cannot delegate to self");
  }

  _taskCounter++;
  const delegated: DelegatedTask = {
    id: `task_${_taskCounter}`,
    from: from.id,
    to: to.id,
    task,
    priority,
    requiresApproval: to.approvalRequired,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  _taskQueue.push(delegated);
  console.log(`[Organization] ${from.role} → ${to.role}: ${task} (${priority})`);
  return delegated;
}

/** Agent accepts a task */
export function accept(taskId: string): DelegatedTask | null {
  const task = _taskQueue.find(t => t.id === taskId);
  if (!task) return null;
  task.status = "accepted";
  return task;
}

/** Agent completes a task */
export function complete(taskId: string, result: string): DelegatedTask | null {
  const task = _taskQueue.find(t => t.id === taskId);
  if (!task) return null;
  task.status = "completed";
  task.result = result;
  _completedTasks.push(task);
  _taskQueue.splice(_taskQueue.indexOf(task), 1);
  return task;
}

/** Agent rejects a task */
export function rejectTask(taskId: string, reason: string): DelegatedTask | null {
  const task = _taskQueue.find(t => t.id === taskId);
  if (!task) return null;
  task.status = "rejected";
  task.result = reason;
  _completedTasks.push(task);
  _taskQueue.splice(_taskQueue.indexOf(task), 1);
  return task;
}

/** Get pending tasks for an agent */
export function pendingTasks(agentId: string): DelegatedTask[] {
  return _taskQueue.filter(t => t.to === agentId);
}

/** Get completed tasks for an agent */
export function completedTasks(agentId: string): DelegatedTask[] {
  return _completedTasks.filter(t => t.to === agentId);
}

/** CEO delegates high-level tasks to appropriate agents */
export function orchestrate(
  ceo: AgentIdentity,
  task: string,
  agents: AgentIdentity[],
): DelegatedTask[] {
  const results: DelegatedTask[] = [];

  // Route to CTO for code/architecture tasks
  if (/code|bug|deploy|architecture|refactor|server|vps|ssh/i.test(task)) {
    const cto = agents.find(a => a.role === "CTO");
    if (cto) results.push(delegate(ceo, cto, task, "normal"));
  }

  // Route to COO for business/operations tasks
  if (/inventory|order|sales|report|price|business|migrate/i.test(task)) {
    const coo = agents.find(a => a.role === "COO");
    if (coo) results.push(delegate(ceo, coo, task, "normal"));
  }

  // No match? Delegate to CTO (default)
  if (results.length === 0) {
    const cto = agents.find(a => a.role === "CTO");
    if (cto) results.push(delegate(ceo, cto, task, "low"));
  }

  return results;
}

export const organizationRuntime = {
  name: "OrganizationRuntime",
  version: "1.0.0",
  capabilities: ["task-delegation", "hierarchical-routing", "agent-orchestration"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  delegate,
  accept,
  complete,
  reject: rejectTask,
  pending: pendingTasks,
  completed: completedTasks,
  orchestrate,
};
