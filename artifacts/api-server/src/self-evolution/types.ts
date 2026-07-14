export type EvolutionStatus = "proposed" | "approved" | "rejected" | "implemented";

export type EvolutionAction = "create_doc" | "update_doc" | "create_adr" | "refactor" | "deprecate" | "none";

export interface EvolutionProposal {
  id: string;
  title: string;
  description: string;
  proposedAction: EvolutionAction;
  target: string;
  rationale: string;
  risk: "low" | "medium" | "high";
  status: EvolutionStatus;
  proposedAt: string;
  resolvedAt?: string;
  approvedBy?: string;
  tags: string[];
}

export interface EvolutionMetrics {
  totalProposals: number;
  approved: number;
  rejected: number;
  implemented: number;
  pending: number;
  approvalRate: number;
  implementationRate: number;
  byAction: Record<string, number>;
}
