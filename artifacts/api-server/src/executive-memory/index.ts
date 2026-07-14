export * from "./types";
export { ExecutiveMemoryProvider } from "./ExecutiveMemoryProvider";
export { recordDecision, queryDecisions, getDecisionById, getAllDecisions, clearDecisions } from "./DecisionRecorder";
export { recallDecisions, recallForExecutive, recallByDomain, recallRecent } from "./MemoryRecallEngine";
export { recordOutcome, getOutcomeHistory, getOutcomeStats, clearOutcomeLog } from "./OutcomeTracker";
export { detectPatterns } from "./PatternDetector";

let initialized = false;

export function initializeExecutiveMemory(): void {
  if (initialized) return;
  initialized = true;
  console.log("[EM] Executive Memory active — Decision Recording + Recall + Outcome Tracking + Pattern Detection ready");
}
