import type { EvolutionProposal, EvolutionAction, EvolutionMetrics } from "./types";
import { EvolutionEngine } from "./EvolutionEngine";

export const SelfEvolutionProvider = {
  propose(params: {
    title: string;
    description: string;
    proposedAction: EvolutionAction;
    target: string;
    rationale: string;
    risk: "low" | "medium" | "high";
    tags?: string[];
  }): EvolutionProposal {
    return EvolutionEngine.propose(params);
  },

  approve(id: string): EvolutionProposal | null {
    return EvolutionEngine.approve(id);
  },

  reject(id: string): EvolutionProposal | null {
    return EvolutionEngine.reject(id);
  },

  implement(id: string): EvolutionProposal | null {
    return EvolutionEngine.implement(id);
  },

  getProposal(id: string): EvolutionProposal | undefined {
    return EvolutionEngine.get(id);
  },

  getPending(): EvolutionProposal[] {
    return EvolutionEngine.getPending();
  },

  getAll(): EvolutionProposal[] {
    return EvolutionEngine.getAll();
  },

  getMetrics(): EvolutionMetrics {
    return EvolutionEngine.getMetrics();
  },
};
