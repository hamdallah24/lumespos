// ECP-042: Executive Debate — Multi-turn discussion with moderator
// CEO acts as moderator. Each participant gets turns to argue.
// No runtime calls another runtime. All messages through engine.

import type { ExecutiveRole } from "./executive-task";

export interface DebateMessage {
  id: string;
  turn: number;
  from: ExecutiveRole;
  type: "ARGUMENT" | "COUNTER" | "REBUTTAL" | "FINAL";
  content: string;
  timestamp: string;
}

export interface DebateSession {
  id: string;
  topic: string;
  moderator: ExecutiveRole;
  participants: ExecutiveRole[];
  turns: number;
  maxTurns: number;
  history: DebateMessage[];
  active: boolean;
}

let _debateCounter = 0;

export class ExecutiveDebate {

  private sessions: Map<string, DebateSession> = new Map();

  /** Start a new debate session */
  startDebate(
    topic: string,
    participants: ExecutiveRole[],
    moderator: ExecutiveRole = "CEO",
    maxTurns: number = 3,
  ): DebateSession {
    _debateCounter++;
    const session: DebateSession = {
      id: `DEBATE-${Date.now().toString(36)}-${_debateCounter}`,
      topic,
      moderator,
      participants,
      turns: 0,
      maxTurns,
      history: [],
      active: true,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Add a message to the debate */
  speak(sessionId: string, message: DebateMessage): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.active) return false;
    if (!session.participants.includes(message.from) && message.from !== session.moderator) return false;

    session.history.push(message);
    session.turns++;

    if (session.turns >= session.maxTurns) {
      session.active = false;
    }
    return true;
  }

  /** Check if debate is still active */
  isActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.active : false;
  }

  /** Get full debate transcript */
  getTranscript(sessionId: string): DebateMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.history] : [];
  }

  /** Close debate */
  close(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
    }
  }
}

export const executiveDebate = new ExecutiveDebate();
