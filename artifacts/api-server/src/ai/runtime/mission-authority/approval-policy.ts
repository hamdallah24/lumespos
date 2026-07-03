// ECP-034: Approval Policy — auto-approval rules
// Frozen. Priority <60 Auto-Reject, 60-80 CEO, 80-90 Council, >90 Founder.

import type { MissionProposal } from "./mission-types";

interface ApprovalDecision {
  approved: boolean;
  autoApproved: boolean;
  requiredApprover: string;
  reason: string;
}

class ApprovalPolicy {
  decide(proposal: MissionProposal): ApprovalDecision {
    const p = proposal.priority;

    if (p < 50) {
      return { approved: false, autoApproved: true, requiredApprover: "System", reason: "Priority too low — auto-rejected" };
    }
    if (p >= 90) {
      return { approved: false, autoApproved: false, requiredApprover: "Founder", reason: "Critical priority — requires Founder approval" };
    }
    if (p >= 80) {
      return { approved: false, autoApproved: false, requiredApprover: "Council", reason: "High priority — requires Council approval" };
    }
    if (p >= 60) {
      return { approved: true, autoApproved: true, requiredApprover: "CEO", reason: "Auto-approved (priority 60-79)" };
    }
    return { approved: false, autoApproved: true, requiredApprover: "System", reason: "Below threshold — rejected" };
  }
}

export const approvalPolicy = new ApprovalPolicy();
