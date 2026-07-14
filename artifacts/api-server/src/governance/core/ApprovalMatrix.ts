import type { ExecutiveRole } from "../governance-types";
import type { ApprovalLevel } from "../../operational-decision-engine/core/types";

const APPROVAL_CHAIN: Record<ApprovalLevel, ExecutiveRole[]> = {
  auto: [],
  manager: ["COO"],
  coo: ["COO"],
  ceo: ["CEO"],
  founder: ["CEO", "CFO"],
};

export const ApprovalMatrix = {
  getRequiredApprovers(level: ApprovalLevel): ExecutiveRole[] {
    return APPROVAL_CHAIN[level] ?? [];
  },

  needsApproval(level: ApprovalLevel): boolean {
    return level !== "auto" && APPROVAL_CHAIN[level]?.length > 0;
  },

  canApprove(role: ExecutiveRole, level: ApprovalLevel): boolean {
    const approvers = APPROVAL_CHAIN[level];
    if (!approvers) return false;
    return approvers.includes(role);
  },

  getApprovalLevel(value: number, resource: string): ApprovalLevel {
    if (resource === "transfer" && value > 10000000) return "founder";
    if (resource === "transfer" && value > 5000000) return "ceo";
    if (resource === "transfer" && value > 1000000) return "coo";
    if (resource === "price_change") return "ceo";
    if (resource === "budget" && value > 50000000) return "founder";
    if (resource === "budget" && value > 10000000) return "ceo";
    if (resource === "budget" && value > 1000000) return "coo";
    return "auto";
  },
};
