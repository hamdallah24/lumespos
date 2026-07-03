// ECP-033: Decision Record — permanent archive of all council decisions
// Frozen. Every decision is stored with full traceability.

import type { CouncilDecision } from "./types";

class DecisionRecord {
  private _decisions: CouncilDecision[] = [];
  private _counter = 0;

  record(
    sessionId: string,
    outcome: CouncilDecision["outcome"],
    consensus: number,
    participants: number,
    opinions: number,
    rationale: string,
    decidedBy: "Council" | "Founder" = "Council",
  ): CouncilDecision {
    this._counter++;
    const decision: CouncilDecision = {
      id: `D-${String(this._counter).padStart(6, "0")}`,
      sessionId,
      outcome,
      consensus,
      participants,
      opinions,
      rationale,
      decidedAt: new Date().toISOString(),
      decidedBy,
      archived: false,
    };

    this._decisions.push(decision);
    if (this._decisions.length > 500) this._decisions.splice(0, 100);
    return decision;
  }

  getBySession(sessionId: string): CouncilDecision | undefined {
    return this._decisions.find(d => d.sessionId === sessionId);
  }

  recent(limit = 20): CouncilDecision[] {
    return this._decisions.slice(-limit).reverse();
  }

  archive(decisionId: string): void {
    const d = this._decisions.find(d => d.id === decisionId);
    if (d) d.archived = true;
  }

  get total(): number { return this._decisions.length; }
}

export const decisionRecord = new DecisionRecord();
