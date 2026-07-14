import type { DecisionRecord, DecisionFilter, MemoryRecall, DecisionOutcome, OutcomeRecord, DetectedPattern, ExecutiveMemoryStats, ExecutiveRole, DecisionDomain } from "./types";
import { recordDecision, queryDecisions, getDecisionById, getAllDecisions } from "./DecisionRecorder";
import { recallDecisions, recallForExecutive, recallByDomain, recallRecent } from "./MemoryRecallEngine";
import { recordOutcome, getOutcomeHistory, getOutcomeStats } from "./OutcomeTracker";
import { detectPatterns } from "./PatternDetector";

export const ExecutiveMemoryProvider = {
  recordDecision(params: {
    executive: ExecutiveRole;
    domain: DecisionDomain;
    title: string;
    description: string;
    situationId?: string;
    alternatives: string[];
    selectedOption: string;
    tags?: string[];
    relatedDecisionIds?: string[];
    missionId?: string;
    confidence?: number;
  }): DecisionRecord {
    return recordDecision(params);
  },

  queryDecisions(filter: DecisionFilter): DecisionRecord[] {
    return queryDecisions(filter);
  },

  getDecision(id: string): DecisionRecord | undefined {
    return getDecisionById(id);
  },

  getAllDecisions(): DecisionRecord[] {
    return getAllDecisions();
  },

  recall(filter: DecisionFilter): MemoryRecall {
    return recallDecisions(filter);
  },

  recallForExecutive(executive: ExecutiveRole, limit = 10): MemoryRecall {
    return recallForExecutive(executive, limit);
  },

  recallRecent(limit = 10): MemoryRecall {
    return recallRecent(limit);
  },

  recordOutcome(decisionId: string, outcome: DecisionOutcome, notes?: string): boolean {
    return recordOutcome({ decisionId, outcome, notes });
  },

  getOutcomeHistory(decisionId: string): OutcomeRecord[] {
    return getOutcomeHistory(decisionId);
  },

  getOutcomeStats() {
    return getOutcomeStats();
  },

  detectPatterns(): DetectedPattern[] {
    return detectPatterns();
  },

  getStats(): ExecutiveMemoryStats {
    const all = getAllDecisions();
    const byExecutive: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const d of all) {
      byExecutive[d.executive] = (byExecutive[d.executive] ?? 0) + 1;
      byDomain[d.domain] = (byDomain[d.domain] ?? 0) + 1;
      byOutcome[d.outcome] = (byOutcome[d.outcome] ?? 0) + 1;
    }

    const evaluated = all.filter((d) => d.outcome === "success" || d.outcome === "failure");
    const successes = evaluated.filter((d) => d.outcome === "success").length;

    return {
      totalDecisions: all.length,
      byExecutive,
      byDomain,
      byOutcome,
      successRate: evaluated.length > 0 ? Math.round((successes / evaluated.length) * 100) : 0,
      patternsDetected: detectPatterns().length,
    };
  },
};
