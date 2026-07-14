import type { CouncilOutcomeRecord, LearningOutcome } from "./CouncilLearningTypes";

const outcomeLog: CouncilOutcomeRecord[] = [];
const MAX_LOG = 500;

export function recordCouncilOutcome(record: Omit<CouncilOutcomeRecord, "recordedAt">): CouncilOutcomeRecord {
  const full: CouncilOutcomeRecord = { ...record, recordedAt: new Date().toISOString() };
  outcomeLog.unshift(full);
  if (outcomeLog.length > MAX_LOG) outcomeLog.length = MAX_LOG;
  return full;
}

export function getCouncilOutcomes(): CouncilOutcomeRecord[] {
  return [...outcomeLog];
}

export function getCouncilOutcomesByOutcome(outcome: LearningOutcome): CouncilOutcomeRecord[] {
  return outcomeLog.filter(r => r.outcome === outcome);
}

export function getCouncilOutcomeStats() {
  const total = outcomeLog.length;
  const success = outcomeLog.filter(r => r.outcome === "success").length;
  const failure = outcomeLog.filter(r => r.outcome === "failure").length;
  const partial = outcomeLog.filter(r => r.outcome === "partial").length;
  const totalDuration = outcomeLog.reduce((sum, r) => sum + r.durationMs, 0);
  return {
    total,
    success,
    failure,
    partial,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    averageDurationMs: total > 0 ? Math.round(totalDuration / total) : 0,
  };
}

export function clearCouncilOutcomes(): void {
  outcomeLog.length = 0;
}
