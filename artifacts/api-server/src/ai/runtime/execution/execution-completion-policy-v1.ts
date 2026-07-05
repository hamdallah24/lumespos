// RFC-010: Execution Completion Policy v1
// Goal completes ONLY when evidence meets minimum threshold.
// Governor reads this policy. No hardcoded numbers in Governor.

export const EXECUTION_COMPLETION_POLICY_V1 = {
  version: 1,
  minimumEvidence: 0.40,
  minimumConfidence: 0.50,
  minimumSuccessRate: 0.70,
  description: "Goal completes only when evidence >= 40% AND confidence >= 50% AND tool success rate >= 70%",
  createdBy: "RFC-010",
  createdAt: "2026-07-05",
};
