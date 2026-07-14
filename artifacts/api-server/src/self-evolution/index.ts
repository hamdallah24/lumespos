export * from "./types";
export { EvolutionEngine } from "./EvolutionEngine";
export { SelfEvolutionProvider } from "./SelfEvolutionProvider";
export { computeEvolutionMetrics } from "./EvolutionMetricsTracker";
export {
  createProposal, approveProposal, rejectProposal, markImplemented,
  getProposal, getPendingProposals, getAllProposals, clearProposals,
} from "./EvolutionProposalManager";

let initialized = false;

export function initializeSelfEvolution(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[SE] Self Evolution initialized — Proposal Manager + Engine + Metrics ready`);
}
