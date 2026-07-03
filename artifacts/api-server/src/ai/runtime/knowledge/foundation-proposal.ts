// ECP-029.5: Foundation Proposal Generator
// Frozen. Generates ADR draft when knowledge reaches FOUNDATION_CANDIDATE.
// Knowledge Office proposes. Founder approves. CEO implements.
// Knowledge Office NEVER modifies Foundation directly.

import type { KnowledgeCard } from "./knowledge-card";

interface FoundationProposal {
  id: string;
  title: string;
  type: "policy" | "directive" | "architecture" | "capability";
  sourceCards: string[];
  rationale: string;
  impact: string;
  draftContent: string;
  generatedAt: string;
  status: "pending" | "approved" | "rejected";
}

class FoundationProposalGenerator {
  private _proposals: FoundationProposal[] = [];

  /** Generate proposal from FOUNDATION_CANDIDATE cards */
  generate(card: KnowledgeCard): FoundationProposal {
    const proposal: FoundationProposal = {
      id: `proposal-${Date.now()}`,
      title: `Incorporate knowledge: ${card.topic}`,
      type: this.inferType(card),
      sourceCards: [card.id, ...card.relatedCards],
      rationale: `This knowledge has been validated across ${card.sourceCount} missions ` +
        `with ${card.confidence}% confidence and 0 contradictions. ` +
        `It has reached FOUNDATION_CANDIDATE status through automated promotion rules.`,
      impact: `Adding this to Foundation would codify a proven best practice. ` +
        `Current confidence: ${card.confidence}%. Source count: ${card.sourceCount}.`,
      draftContent: card.summary,
      generatedAt: new Date().toISOString(),
      status: "pending",
    };

    this._proposals.push(proposal);
    return proposal;
  }

  /** Scan all FOUNDATION_CANDIDATE cards and generate proposals */
  scanAndPropose(cards: KnowledgeCard[]): FoundationProposal[] {
    const candidates = cards.filter(c => c.status === "FOUNDATION_CANDIDATE");
    return candidates.map(c => this.generate(c));
  }

  private inferType(card: KnowledgeCard): FoundationProposal["type"] {
    if (card.tags.some(t => ["architecture", "structure"].includes(t))) return "architecture";
    if (card.tags.some(t => ["policy", "governance", "rule"].includes(t))) return "policy";
    if (card.tags.some(t => ["capability", "tool", "access"].includes(t))) return "capability";
    if (card.tags.some(t => ["directive", "runtime", "behavior"].includes(t))) return "directive";
    return "policy";
  }

  getProposals(): FoundationProposal[] { return [...this._proposals]; }
  getPending(): FoundationProposal[] { return this._proposals.filter(p => p.status === "pending"); }
}

export const proposalGenerator = new FoundationProposalGenerator();
