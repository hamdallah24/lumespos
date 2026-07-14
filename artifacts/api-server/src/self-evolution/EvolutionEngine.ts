import type { EvolutionProposal, EvolutionAction, EvolutionMetrics } from "./types";
import {
  createProposal, approveProposal, rejectProposal, markImplemented,
  getProposal, getPendingProposals, getAllProposals, getProposalsByStatus,
} from "./EvolutionProposalManager";
import { computeEvolutionMetrics } from "./EvolutionMetricsTracker";

export const EvolutionEngine = {
  propose(params: {
    title: string;
    description: string;
    proposedAction: EvolutionAction;
    target: string;
    rationale: string;
    risk: "low" | "medium" | "high";
    tags?: string[];
  }): EvolutionProposal {
    return createProposal(params);
  },

  approve(id: string, approvedBy?: string): EvolutionProposal | null {
    return approveProposal(id, approvedBy);
  },

  reject(id: string, approvedBy?: string): EvolutionProposal | null {
    return rejectProposal(id, approvedBy);
  },

  implement(id: string): EvolutionProposal | null {
    return markImplemented(id);
  },

  get(id: string): EvolutionProposal | undefined {
    return getProposal(id);
  },

  getPending(): EvolutionProposal[] {
    return getPendingProposals();
  },

  getAll(): EvolutionProposal[] {
    return getAllProposals();
  },

  getByStatus(status: string): EvolutionProposal[] {
    return getProposalsByStatus(status as any);
  },

  getMetrics(): EvolutionMetrics {
    return computeEvolutionMetrics();
  },
};
