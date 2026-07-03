// ECP-034: Priority Engine — scores and ranks mission proposals
// Frozen. Multi-factor scoring: Business Impact 30%, Urgency 20%, Founder 20%, Risk 15%, Knowledge 10%, Tech Debt 5%.

import type { MissionProposal } from "./mission-types";

interface PriorityResult {
  score: number;
  factors: Record<string, number>;
  rank: number;
}

class PriorityEngine {
  score(proposal: Omit<MissionProposal, "priority">): PriorityResult {
    // Factor weights
    const factors = {
      businessImpact: 30,
      urgency: 20,
      founderWeight: 20,
      risk: 15,
      knowledgeGain: 10,
      technicalDebt: 5,
    };

    // Score each factor (0-100)
    const scores = {
      businessImpact: this.scoreImpact(proposal),
      urgency: this.scoreUrgency(proposal),
      founderWeight: proposal.proposedBy === "Founder" ? 100 : 60,
      risk: 65,
      knowledgeGain: proposal.type === "learning" || proposal.type === "research" ? 90 : 50,
      technicalDebt: proposal.type === "maintenance" || proposal.type === "architecture" ? 80 : 30,
    };

    let totalScore = 0;
    for (const [factor, weight] of Object.entries(factors)) {
      totalScore += (scores[factor as keyof typeof scores] || 50) * weight / 100;
    }

    return { score: Math.round(totalScore), factors: scores, rank: 0 };
  }

  rank(proposals: MissionProposal[]): MissionProposal[] {
    return [...proposals]
      .map(p => ({ ...p, priority: this.score(p).score }))
      .sort((a, b) => b.priority - a.priority);
  }

  private scoreImpact(p: Omit<MissionProposal, "priority">): number {
    if (p.type === "strategic") return 95;
    if (p.type === "incident") return 90;
    if (p.type === "compliance") return 85;
    if (p.type === "governance") return 80;
    return 60;
  }

  private scoreUrgency(p: Omit<MissionProposal, "priority">): number {
    if (p.type === "incident" || p.type === "compliance") return 100;
    if (p.type === "strategic") return 80;
    if (p.type === "operational") return 70;
    if (p.type === "maintenance") return 40;
    return 50;
  }
}

export const priorityEngine = new PriorityEngine();
