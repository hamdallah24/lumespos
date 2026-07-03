// ECP-032.5: Decision Registry — records all organizational decisions
// Frozen. Every decision gets a unique ID with traceability.

import type { DecisionEntry } from "./types";

class DecisionRegistry {
  private _decisions: DecisionEntry[] = [];
  private _counter = 0;

  record(entry: Omit<DecisionEntry, "id" | "timestamp">): DecisionEntry {
    this._counter++;
    const decision: DecisionEntry = {
      ...entry,
      id: `D-${String(this._counter).padStart(6, "0")}`,
      timestamp: new Date().toISOString(),
    };

    this._decisions.push(decision);
    if (this._decisions.length > 1000) this._decisions.splice(0, 200);
    return decision;
  }

  getByTrace(traceId: string): DecisionEntry[] {
    return this._decisions.filter(d => d.traceId === traceId);
  }

  getByRuntime(runtime: string, limit = 20): DecisionEntry[] {
    return this._decisions.filter(d => d.runtime === runtime).slice(-limit);
  }

  getByMission(missionId: string): DecisionEntry[] {
    return this._decisions.filter(d => d.missionId === missionId);
  }

  recent(limit = 20): DecisionEntry[] {
    return this._decisions.slice(-limit).reverse();
  }

  get total(): number { return this._decisions.length; }
}

export const decisionRegistry = new DecisionRegistry();
