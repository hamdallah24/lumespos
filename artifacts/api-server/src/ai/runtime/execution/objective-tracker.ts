// ECP-019: Objective Tracker — 9-state universal lifecycle
// Frozen. No tool-specific states. COlLECTING_EVIDENCE covers all tool calls.

import type { ObjectiveState } from "./execution-manifest";

const validTransitions: Record<ObjectiveState, ObjectiveState[]> = {
  INIT:               ["UNDERSTANDING", "PLANNING"],
  UNDERSTANDING:      ["PLANNING", "COLLECTING_EVIDENCE", "BLOCKED"],
  PLANNING:           ["COLLECTING_EVIDENCE", "ANALYZING"],
  COLLECTING_EVIDENCE: ["COLLECTING_EVIDENCE", "ANALYZING", "VERIFYING", "BLOCKED"],
  ANALYZING:          ["COLLECTING_EVIDENCE", "VERIFYING", "REFLECTING", "BLOCKED"],
  VERIFYING:          ["REFLECTING", "COMPLETED", "BLOCKED"],
  REFLECTING:         ["COMPLETED", "COLLECTING_EVIDENCE", "BLOCKED"],
  COMPLETED:          [],
  BLOCKED:            ["COLLECTING_EVIDENCE", "ANALYZING", "PAUSED"],
  PAUSED:             ["COLLECTING_EVIDENCE", "ANALYZING", "BLOCKED"],
};

class ObjectiveTracker {
  private _state: ObjectiveState = "INIT";
  private _history: { from: ObjectiveState; to: ObjectiveState; timestamp: number }[] = [];
  private _startedAt: number = Date.now();

  get state(): ObjectiveState { return this._state; }
  get history() { return [...this._history]; }
  get elapsedMs(): number { return Date.now() - this._startedAt; }

  transition(to: ObjectiveState): boolean {
    const allowed = validTransitions[this._state] || [];
    if (!allowed.includes(to) && this._state !== to) return false;
    this._history.push({ from: this._state, to, timestamp: Date.now() });
    this._state = to;
    return true;
  }

  isComplete(): boolean { return this._state === "COMPLETED"; }
  isBlocked(): boolean { return this._state === "BLOCKED"; }
  isTerminal(): boolean { return this.isComplete() || this._state === "PAUSED"; }

  /** Infer state from tool call behavior */
  inferFromToolCalls(hasTools: boolean, toolsAreSearch: boolean, toolsAreRead: boolean): ObjectiveState {
    if (!hasTools) {
      if (this._state === "REFLECTING") return "REFLECTING";
      if (this._state === "VERIFYING") return "REFLECTING";
      return "ANALYZING";
    }
    if (toolsAreSearch) return "COLLECTING_EVIDENCE";
    if (toolsAreRead) return "INVESTIGATE" as any;
    return "COLLECTING_EVIDENCE";
  }

  reset(): void {
    this._state = "INIT";
    this._history = [];
    this._startedAt = Date.now();
  }
}

export { ObjectiveTracker };
