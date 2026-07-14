import type { EvolutionMetrics } from "./types";
import { getAllProposals } from "./EvolutionProposalManager";

export function computeEvolutionMetrics(): EvolutionMetrics {
  const all = getAllProposals();
  const total = all.length;
  const approved = all.filter(p => p.status === "approved").length;
  const rejected = all.filter(p => p.status === "rejected").length;
  const implemented = all.filter(p => p.status === "implemented").length;
  const pending = all.filter(p => p.status === "proposed").length;

  const byAction: Record<string, number> = {};
  for (const p of all) {
    byAction[p.proposedAction] = (byAction[p.proposedAction] ?? 0) + 1;
  }

  return {
    totalProposals: total,
    approved,
    rejected,
    implemented,
    pending,
    approvalRate: total > 0 ? Math.round(((approved + implemented) / total) * 100) : 0,
    implementationRate: approved + implemented > 0 ? Math.round((implemented / (approved + implemented)) * 100) : 0,
    byAction,
  };
}
