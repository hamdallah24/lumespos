// ECP-045 Sprint 5: Decision History
// Stores all organizational decisions with outcomes and lessons.
// Enables evaluation of past decisions and pattern detection.

import type { ExecutiveRole, DecisionHistory } from "./intelligence-types";
import { createDecisionId } from "./intelligence-types";

export class DecisionHistoryStore {
  private decisions: Map<string, DecisionHistory> = new Map();

  /** Record a decision */
  record(
    missionId: string,
    question: string,
    participants: ExecutiveRole[],
    alternatives: string[],
    selected: string,
  ): DecisionHistory {
    const decision: DecisionHistory = {
      decisionId: createDecisionId(),
      missionId,
      question,
      participants,
      alternatives,
      selected,
      outcome: "UNKNOWN",
      lessons: [],
      decidedAt: new Date().toISOString(),
    };
    this.decisions.set(decision.decisionId, decision);
    return decision;
  }

  /** Evaluate decision outcome */
  evaluate(
    decisionId: string,
    outcome: "SUCCESS" | "FAILURE",
    lessons: string[],
  ): void {
    const decision = this.decisions.get(decisionId);
    if (!decision) return;
    decision.outcome = outcome;
    decision.lessons = lessons;
    decision.evaluatedAt = new Date().toISOString();
  }

  /** Get decisions by mission */
  getByMission(missionId: string): DecisionHistory[] {
    return [...this.decisions.values()]
      .filter(d => d.missionId === missionId)
      .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt));
  }

  /** Get decisions by participant */
  getByParticipant(executive: ExecutiveRole): DecisionHistory[] {
    return [...this.decisions.values()]
      .filter(d => d.participants.includes(executive))
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  }

  /** Get successful decisions */
  getSuccessful(): DecisionHistory[] {
    return [...this.decisions.values()]
      .filter(d => d.outcome === "SUCCESS" && d.evaluatedAt)
      .sort((a, b) => new Date(b.evaluatedAt!).getTime() - new Date(a.evaluatedAt!).getTime());
  }

  /** Get failed decisions */
  getFailed(): DecisionHistory[] {
    return [...this.decisions.values()]
      .filter(d => d.outcome === "FAILURE" && d.evaluatedAt)
      .sort((a, b) => new Date(b.evaluatedAt!).getTime() - new Date(a.evaluatedAt!).getTime());
  }

  /** Get unevaluated decisions */
  getPending(): DecisionHistory[] {
    return [...this.decisions.values()]
      .filter(d => d.outcome === "UNKNOWN");
  }

  /** Search decisions by keyword */
  search(query: string): DecisionHistory[] {
    const lower = query.toLowerCase();
    return [...this.decisions.values()]
      .filter(d =>
        d.question.toLowerCase().includes(lower) ||
        d.alternatives.some(a => a.toLowerCase().includes(lower)) ||
        d.selected.toLowerCase().includes(lower) ||
        d.lessons.some(l => l.toLowerCase().includes(lower))
      )
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  }

  /** Stats */
  stats() {
    const all = [...this.decisions.values()];
    const evaluated = all.filter(d => d.outcome !== "UNKNOWN");
    return {
      total: all.length,
      evaluated: evaluated.length,
      pending: all.length - evaluated.length,
      successRate: evaluated.length > 0
        ? Math.round((evaluated.filter(d => d.outcome === "SUCCESS").length / evaluated.length) * 100)
        : 0,
      failureRate: evaluated.length > 0
        ? Math.round((evaluated.filter(d => d.outcome === "FAILURE").length / evaluated.length) * 100)
        : 0,
    };
  }
}

export const decisionHistoryStore = new DecisionHistoryStore();
