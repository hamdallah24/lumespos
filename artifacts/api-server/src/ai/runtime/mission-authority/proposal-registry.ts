// ECP-034: Proposal Registry — stores all mission proposals
// Frozen. Single source of truth for mission proposals.

import type { MissionProposal, MissionEntry } from "./mission-types";

class ProposalRegistry {
  private _proposals = new Map<string, MissionProposal>();
  private _missions = new Map<string, MissionEntry>();
  private _counter = 0;

  register(proposal: Omit<MissionProposal, "id" | "status" | "createdAt" | "alignmentScore" | "conflictIds">): MissionProposal {
    this._counter++;
    const full: MissionProposal = {
      ...proposal, id: `PROP-${String(this._counter).padStart(4, "0")}`,
      status: "PROPOSAL", createdAt: new Date().toISOString(),
      alignmentScore: 0, conflictIds: [],
    };
    this._proposals.set(full.id, full);
    return full;
  }

  /** Promote a proposal to an active mission */
  promote(proposalId: string, assignedTo: string): MissionEntry | null {
    const proposal = this._proposals.get(proposalId);
    if (!proposal) return null;

    const mission: MissionEntry = {
      id: `M-${String(this._counter).padStart(4, "0")}`,
      proposalId, title: proposal.title, type: proposal.type,
      status: "ACTIVE", assignedTo, priority: proposal.priority,
      strategicObjective: proposal.strategicObjective,
      dependencies: proposal.dependencies,
      startedAt: new Date().toISOString(),
    };

    this._missions.set(mission.id, mission);
    proposal.status = "APPROVAL";
    return mission;
  }

  getProposal(id: string): MissionProposal | undefined { return this._proposals.get(id); }
  getAllProposals(): MissionProposal[] { return [...this._proposals.values()]; }
  getByStatus(status: string): MissionProposal[] { return [...this._proposals.values()].filter(p => p.status === status); }
  getByProposer(runtime: string): MissionProposal[] { return [...this._proposals.values()].filter(p => p.proposedBy === runtime); }

  getMission(id: string): MissionEntry | undefined { return this._missions.get(id); }
  getAllMissions(): MissionEntry[] { return [...this._missions.values()]; }
  countByStatus(status: string): number { return [...this._missions.values()].filter(m => m.status === status).length; }
}

export const proposalRegistry = new ProposalRegistry();
