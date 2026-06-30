// SPRINT 12: Knowledge Evolution Engine
// Reflection → Evidence → Proposal → Founder Approval → Evolution
// NEVER auto-modify knowledge. ALWAYS require Founder approval.

import type { EvidencePacket } from "./evidence-collector";

export interface KnowledgeEvolutionProposal {
  id: string;
  title: string;
  evidence: EvidencePacket;
  proposedAction: "create_doc" | "update_doc" | "create_adr" | "none";
  targetFile: string;
  rationale: string;
  risk: "low" | "medium" | "high";
  status: "proposed" | "approved" | "rejected" | "implemented";
  proposedAt: string;
  approvedBy?: string;
}

let _proposals: KnowledgeEvolutionProposal[] = [];
const MAX_PROPOSALS = 50;

/** Generate evolution proposal from evidence */
export function propose(
  evidence: EvidencePacket,
  override?: { action?: KnowledgeEvolutionProposal["proposedAction"]; target?: string; rationale?: string },
): KnowledgeEvolutionProposal | null {
  if (evidence.strength === "weak") return null;

  const gaps = evidence.collected.filter(e => e.type === "gap");
  if (gaps.length === 0) return null;

  const gap = gaps[0];
  const proposal: KnowledgeEvolutionProposal = {
    id: `ev_${Date.now()}`,
    title: override?.target || `${gap.data.domain}_REFERENCE.md`,
    evidence,
    proposedAction: override?.action || "create_doc",
    targetFile: `.ai/specs/${gap.data.domain}_SPEC.md`,
    rationale: override?.rationale || gap.data.description,
    risk: gap.data.severity === "high" ? "high" : "low",
    status: "proposed",
    proposedAt: new Date().toISOString(),
  };

  _proposals.push(proposal);
  if (_proposals.length > MAX_PROPOSALS) _proposals.shift();

  console.log(`[KnowledgeEvolution] PROPOSAL: ${proposal.title} — ${proposal.proposedAction} — awaiting Founder approval`);
  return proposal;
}

/** Founder approves a proposal */
export function approve(id: string): KnowledgeEvolutionProposal | null {
  const p = _proposals.find(pr => pr.id === id);
  if (!p) return null;
  p.status = "approved";
  p.approvedBy = "Founder";
  return p;
}

/** Founder rejects a proposal */
export function reject(id: string, reason?: string): KnowledgeEvolutionProposal | null {
  const p = _proposals.find(pr => pr.id === id);
  if (!p) return null;
  p.status = "rejected";
  p.approvedBy = `Founder${reason ? `: ${reason}` : ""}`;
  return p;
}

/** Get all pending proposals */
export function pending(): KnowledgeEvolutionProposal[] {
  return _proposals.filter(p => p.status === "proposed");
}

/** Get proposal history */
export function history(): KnowledgeEvolutionProposal[] {
  return [..._proposals].reverse();
}

export const knowledgeEvolution = {
  name: "KnowledgeEvolution",
  version: "1.0.0",
  capabilities: ["evidence-driven-evolution", "proposal-generation", "founder-approval-gate"],
  dependencies: ["EvidenceCollector"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  propose,
  approve,
  reject,
  pending,
  history,
};
