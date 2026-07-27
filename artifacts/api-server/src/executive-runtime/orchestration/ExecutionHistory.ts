import type { WorkspaceSnapshot } from "./ExecutionWorkspace";

const MAX_HISTORY = 100;

export class ExecutionHistory {
  private sessions: WorkspaceSnapshot[] = [];

  record(snapshot: WorkspaceSnapshot): void {
    this.sessions.push(snapshot);
    if (this.sessions.length > MAX_HISTORY) {
      this.sessions.shift();
    }
  }

  getRecent(count: number = 10): WorkspaceSnapshot[] {
    return this.sessions.slice(-count).reverse();
  }

  getByRequestId(requestId: string): WorkspaceSnapshot | undefined {
    return this.sessions.find(s => s.requestId === requestId);
  }

  getByExecutive(executive: string, count: number = 10): WorkspaceSnapshot[] {
    return this.sessions
      .filter(s => s.selectedExecutive === executive || s.supportingExecutives.includes(executive))
      .slice(-count)
      .reverse();
  }

  getAll(): WorkspaceSnapshot[] {
    return [...this.sessions];
  }

  clear(): void {
    this.sessions = [];
  }

  size(): number {
    return this.sessions.length;
  }
}

let instance: ExecutionHistory | null = null;

export function getExecutionHistory(): ExecutionHistory {
  if (!instance) instance = new ExecutionHistory();
  return instance;
}
