import type { ApprovalLevel, ApprovalResult } from "./types";

export function determineApproval(params: {
  priority: number;
  financialImpact?: { estimatedLoss: number };
  domain: string;
}): ApprovalResult {
  if (params.priority >= 90) {
    return {
      level: "founder",
      deadline: new Date(Date.now() + 1 * 60 * 60 * 1000),
      rationale: "Prioritas ≥ 90 — keputusan strategis memerlukan persetujuan Founder",
    };
  }

  if (params.priority >= 75) {
    return {
      level: "ceo",
      deadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
      rationale: "Prioritas ≥ 75 — CEO dapat memutuskan",
    };
  }

  if (params.priority >= 50) {
    return {
      level: "coo",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      rationale: "Prioritas ≥ 50 — COO dapat memutuskan",
    };
  }

  if (params.priority >= 25) {
    return {
      level: "manager",
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      rationale: "Prioritas ≥ 25 — Manager cabang dapat memutuskan",
    };
  }

  return {
    level: "auto",
    rationale: "Prioritas < 25 — tindakan otomatis tanpa persetujuan",
  };
}
