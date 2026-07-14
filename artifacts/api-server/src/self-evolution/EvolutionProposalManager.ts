import type { EvolutionProposal, EvolutionAction, EvolutionStatus } from "./types";

let proposals: EvolutionProposal[] = [];
let counter = 0;
const MAX_PROPOSALS = 100;

function nextId(): string {
  counter++;
  return `EVOLVE-${Date.now().toString(36)}-${counter}`;
}

export function createProposal(params: {
  title: string;
  description: string;
  proposedAction: EvolutionAction;
  target: string;
  rationale: string;
  risk: "low" | "medium" | "high";
  tags?: string[];
}): EvolutionProposal {
  const proposal: EvolutionProposal = {
    id: nextId(),
    title: params.title,
    description: params.description,
    proposedAction: params.proposedAction,
    target: params.target,
    rationale: params.rationale,
    risk: params.risk,
    status: "proposed",
    proposedAt: new Date().toISOString(),
    tags: params.tags ?? [],
  };
  proposals.unshift(proposal);
  if (proposals.length > MAX_PROPOSALS) proposals.length = MAX_PROPOSALS;
  return proposal;
}

export function approveProposal(id: string, approvedBy = "Founder"): EvolutionProposal | null {
  const p = proposals.find(pr => pr.id === id);
  if (!p || p.status !== "proposed") return null;
  p.status = "approved";
  p.approvedBy = approvedBy;
  p.resolvedAt = new Date().toISOString();
  return p;
}

export function rejectProposal(id: string, approvedBy = "Founder"): EvolutionProposal | null {
  const p = proposals.find(pr => pr.id === id);
  if (!p || p.status !== "proposed") return null;
  p.status = "rejected";
  p.approvedBy = approvedBy;
  p.resolvedAt = new Date().toISOString();
  return p;
}

export function markImplemented(id: string): EvolutionProposal | null {
  const p = proposals.find(pr => pr.id === id);
  if (!p || p.status !== "approved") return null;
  p.status = "implemented";
  return p;
}

export function getProposal(id: string): EvolutionProposal | undefined {
  return proposals.find(p => p.id === id);
}

export function getPendingProposals(): EvolutionProposal[] {
  return proposals.filter(p => p.status === "proposed");
}

export function getAllProposals(): EvolutionProposal[] {
  return [...proposals];
}

export function getProposalsByStatus(status: EvolutionStatus): EvolutionProposal[] {
  return proposals.filter(p => p.status === status);
}

export function clearProposals(): void {
  proposals = [];
  counter = 0;
}
