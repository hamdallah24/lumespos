import type { DecisionRecord, DecisionOutcome, OutcomeRecord } from "./types";
import { getDecisionById, updateDecisionOutcome, queryDecisions } from "./DecisionRecorder";

const outcomeLog: OutcomeRecord[] = [];
const MAX_LOG = 500;

export function recordOutcome(params: {
  decisionId: string;
  outcome: DecisionOutcome;
  notes?: string;
}): boolean {
  const record = getDecisionById(params.decisionId);
  if (!record) return false;

  const updated = updateDecisionOutcome(params.decisionId, params.outcome);
  if (!updated) return false;

  const logEntry: OutcomeRecord = {
    decisionId: params.decisionId,
    outcome: params.outcome,
    notes: params.notes,
    updatedAt: new Date().toISOString(),
  };

  outcomeLog.unshift(logEntry);
  if (outcomeLog.length > MAX_LOG) {
    outcomeLog.length = MAX_LOG;
  }

  recalcConfidence(params.decisionId);

  return true;
}

export function getOutcomeHistory(decisionId: string): OutcomeRecord[] {
  return outcomeLog.filter((o) => o.decisionId === decisionId);
}

export function getOutcomeStats(): {
  total: number;
  success: number;
  failure: number;
  partial: number;
  pending: number;
  successRate: number;
} {
  const all = queryDecisions({ limit: 10000 });
  const success = all.filter((d) => d.outcome === "success").length;
  const failure = all.filter((d) => d.outcome === "failure").length;
  const partial = all.filter((d) => d.outcome === "partial").length;
  const pending = all.filter((d) => d.outcome === "pending").length;
  const evaluated = success + failure;

  return {
    total: all.length,
    success,
    failure,
    partial,
    pending,
    successRate: evaluated > 0 ? Math.round((success / evaluated) * 100) : 0,
  };
}

function recalcConfidence(decisionId: string): void {
  const record = getDecisionById(decisionId);
  if (!record) return;

  if (record.outcome === "success") {
    record.confidence = Math.min(100, record.confidence + 10);
  } else if (record.outcome === "failure") {
    record.confidence = Math.max(0, record.confidence - 20);
  } else if (record.outcome === "partial") {
    record.confidence = Math.min(100, record.confidence + 5);
  }
}

export function clearOutcomeLog(): void {
  outcomeLog.length = 0;
}
