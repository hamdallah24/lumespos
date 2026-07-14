import type { CouncilSession } from "./CouncilSession";

export const ConsensusDetector = {
  analyze(session: CouncilSession): { hasConsensus: boolean; consensusLevel: string; summary: string } {
    if (session.positions.length === 0) {
      return { hasConsensus: false, consensusLevel: "none", summary: "No positions submitted" };
    }

    const approves = session.positions.filter(p => p.position === "approve").length;
    const rejects = session.positions.filter(p => p.position === "reject").length;
    const abstains = session.positions.filter(p => p.position === "abstain").length;
    const total = session.positions.length;
    const votingTotal = total - abstains;

    if (votingTotal === 0) {
      return { hasConsensus: false, consensusLevel: "none", summary: "All members abstained" };
    }

    const approveRatio = approves / votingTotal;

    if (approveRatio >= 0.8) {
      return { hasConsensus: true, consensusLevel: "strong", summary: `${approves}/${votingTotal} approve — strong consensus` };
    }
    if (approveRatio >= 0.6) {
      return { hasConsensus: true, consensusLevel: "moderate", summary: `${approves}/${votingTotal} approve — moderate consensus` };
    }
    if (rejects > approves) {
      return { hasConsensus: true, consensusLevel: "rejected", summary: `${rejects}/${votingTotal} reject — proposal denied` };
    }

    return { hasConsensus: false, consensusLevel: "divided", summary: `Split: ${approves} approve, ${rejects} reject, ${abstains} abstain` };
  },
};
