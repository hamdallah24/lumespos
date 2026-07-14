export type CouncilStatus = "pending" | "in_progress" | "resolved" | "escalated";

export interface CouncilPosition {
  executiveId: string;
  role: string;
  position: "approve" | "reject" | "abstain" | "modify";
  reasoning: string;
  submittedAt: string;
}

export interface CouncilSession {
  id: string;
  title: string;
  description: string;
  status: CouncilStatus;
  positions: CouncilPosition[];
  deadline: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

let sessionCounter = 0;
function nextId(): string {
  sessionCounter++;
  return `COUNCIL-${Date.now().toString(36)}-${sessionCounter}`;
}

export class CouncilSessionManager {
  private sessions = new Map<string, CouncilSession>();

  create(title: string, description: string, deadline?: Date): CouncilSession {
    const session: CouncilSession = {
      id: nextId(),
      title,
      description,
      status: "pending",
      positions: [],
      deadline: (deadline ?? new Date(Date.now() + 86400000)).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): CouncilSession | undefined {
    return this.sessions.get(id);
  }

  submitPosition(sessionId: string, position: CouncilPosition): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === "resolved") return false;
    session.positions.push(position);
    return true;
  }

  updateStatus(sessionId: string, status: CouncilStatus): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = status;
    if (status === "resolved") session.resolvedAt = new Date().toISOString();
    return true;
  }

  getAll(): CouncilSession[] {
    return Array.from(this.sessions.values());
  }

  getActive(): CouncilSession[] {
    return this.getAll().filter(s => s.status === "pending" || s.status === "in_progress");
  }

  clear(): void {
    this.sessions.clear();
  }
}

export const councilSessionManager = new CouncilSessionManager();
