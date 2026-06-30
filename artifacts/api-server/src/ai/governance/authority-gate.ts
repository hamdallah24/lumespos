// SPRINT 6: Founder Authority Gate — no execution without approval
// Every proposal passes through this gate before execution

export enum GateResult {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REQUEST_REVISION = "REQUEST_REVISION",
  PENDING = "PENDING",
}

interface Proposal {
  id: string;
  type: "code" | "knowledge" | "architecture" | "governance" | "security";
  summary: string;
  affectedAssets: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  requiresFounder: boolean;
}

interface GateDecision {
  result: GateResult;
  reason?: string;
  requiredApprovals?: string[];
  reviewedBy: string;
  timestamp: string;
}

let _pendingProposals: Proposal[] = [];

/** Submit a proposal through the authority gate */
export function submit(proposal: Proposal): GateDecision {
  // Auto-reject: critical risk without founder flag
  if (proposal.riskLevel === "critical" && !proposal.requiresFounder) {
    return {
      result: GateResult.REQUEST_REVISION,
      reason: "Critical risk proposals must be flagged requiresFounder=true",
      reviewedBy: "AuthorityGate",
      timestamp: new Date().toISOString(),
    };
  }

  // Auto-reject: governance or security affecting Foundation
  const foundationAssets = ["north-star-v1", "constitution-v1", "project-context-v1", "op-model-v1", "cto-directive-v1", "foundation-index-v1"];
  const touchesFoundation = proposal.affectedAssets.some(a => foundationAssets.includes(a));
  if ((proposal.type === "governance" || proposal.type === "security") && touchesFoundation && !proposal.requiresFounder) {
    return {
      result: GateResult.REQUEST_REVISION,
      reason: "Foundation assets require Founder approval. Set requiresFounder=true.",
      reviewedBy: "AuthorityGate",
      timestamp: new Date().toISOString(),
    };
  }

  // Requires Founder → hold for approval
  if (proposal.requiresFounder) {
    _pendingProposals.push(proposal);
    return {
      result: GateResult.PENDING,
      reason: "Awaiting Founder approval",
      requiredApprovals: ["Founder"],
      reviewedBy: "AuthorityGate",
      timestamp: new Date().toISOString(),
    };
  }

  // Low/medium risk, not touching foundation → auto-approved
  if (proposal.riskLevel === "low" || proposal.riskLevel === "medium") {
    return {
      result: GateResult.APPROVED,
      reason: "Auto-approved — low/medium risk, non-Foundation scope",
      reviewedBy: "AuthorityGate",
      timestamp: new Date().toISOString(),
    };
  }

  // High risk → hold for founder
  _pendingProposals.push(proposal);
  return {
    result: GateResult.PENDING,
    reason: "High risk proposal requires Founder approval",
    requiredApprovals: ["Founder"],
    reviewedBy: "AuthorityGate",
    timestamp: new Date().toISOString(),
  };
}

/** Get all pending proposals */
export function pending(): Proposal[] {
  return [..._pendingProposals];
}

/** Founder approves a pending proposal */
export function approve(proposalId: string): GateDecision {
  const idx = _pendingProposals.findIndex(p => p.id === proposalId);
  if (idx === -1) return { result: GateResult.REJECTED, reason: "Proposal not found in pending queue", reviewedBy: "AuthorityGate", timestamp: new Date().toISOString() };
  _pendingProposals.splice(idx, 1);
  return { result: GateResult.APPROVED, reason: "Founder approved", reviewedBy: "Founder", timestamp: new Date().toISOString() };
}

/** Founder rejects a pending proposal */
export function reject(proposalId: string, reason?: string): GateDecision {
  const idx = _pendingProposals.findIndex(p => p.id === proposalId);
  if (idx === -1) return { result: GateResult.REJECTED, reason: "Proposal not found in pending queue", reviewedBy: "AuthorityGate", timestamp: new Date().toISOString() };
  _pendingProposals.splice(idx, 1);
  return { result: GateResult.REJECTED, reason: reason || "Rejected by Founder", reviewedBy: "Founder", timestamp: new Date().toISOString() };
}

export const authorityGate = {
  name: "AuthorityGate",
  version: "1.0.0",
  capabilities: ["proposal-gating", "founder-sovereignty", "auto-approval"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
