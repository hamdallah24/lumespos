// ECP-042: Executive Collaboration — Session lifecycle + task distribution + result collection
// Engine TIDAK melakukan reasoning. Engine HANYA mendistribusi dan mengumpulkan.
// CEO melakukan sintesis akhir. Organization Engine adalah dispatcher tunggal.

import { executiveBoard } from "./executive-board";
import type { BoardExecutive } from "./executive-board";
import type { ExecutiveRole, ExecutiveTask, ExecutiveResult } from "./executive-task";

export type CollaborationState = "CREATED" | "RUNNING" | "COLLECTING" | "COMPLETED" | "FAILED";

export interface CollaborationSession {
  id: string;
  state: CollaborationState;
  tasks: ExecutiveTask[];
  results: ExecutiveResult[];
  createdAt: string;
  completedAt?: string;
}

let _sessionCounter = 0;

export class ExecutiveCollaboration {

  private sessions: Map<string, CollaborationSession> = new Map();

  /** Create a new collaboration session */
  createSession(): CollaborationSession {
    _sessionCounter++;
    const session: CollaborationSession = {
      id: `SESSION-${Date.now().toString(36)}-${_sessionCounter}`,
      state: "CREATED",
      tasks: [],
      results: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Assign tasks to executives via Organization Engine dispatch */
  assignTask(
    session: CollaborationSession,
    task: ExecutiveTask,
  ): void {
    session.tasks.push(task);
  }

  /** Get the next pending task for an executive */
  getPendingTask(session: CollaborationSession, role: ExecutiveRole): ExecutiveTask | null {
    return session.tasks.find(t =>
      t.assignedTo.includes(role) && t.status === "PENDING"
    ) || null;
  }

  /** Record an executive's result */
  submitResult(session: CollaborationSession, result: ExecutiveResult): void {
    // Mark corresponding task as completed
    const task = session.tasks.find(t => t.id === result.taskId);
    if (task) {
      task.status = result.status;
      task.completedAt = new Date().toISOString();
    }
    session.results.push(result);
  }

  /** Check if all tasks in session are complete */
  isComplete(session: CollaborationSession): boolean {
    const activeTasks = session.tasks.filter(t => t.status === "PENDING" || t.status === "RUNNING");
    return activeTasks.length === 0;
  }

  /** Collect all results — returns raw collection, no synthesis */
  collectResults(session: CollaborationSession): ExecutiveResult[] {
    session.state = "COLLECTING";
    const sorted = [...session.results].sort((a, b) => b.confidence - a.confidence);
    session.state = "COMPLETED";
    session.completedAt = new Date().toISOString();
    return sorted;
  }

  /** Get session by ID */
  getSession(id: string): CollaborationSession | null {
    return this.sessions.get(id) || null;
  }
}

export const executiveCollaboration = new ExecutiveCollaboration();
