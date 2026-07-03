// ECP-034: Mission Authority — single source of mission truth
// Frozen. Only this component may create, prioritize, approve, cancel missions.
// All Runtimes submit proposals. Mission Authority decides.

import type { MissionProposal, MissionBoard } from "./mission-types";
import { missionAPI } from "./mission-api";
import { proposalRegistry } from "./proposal-registry";
import { priorityEngine } from "./priority-engine";

class MissionAuthority {
  /** Open proposal intake — any runtime may submit */
  submit(proposal: {
    title: string; description: string; type: MissionProposal["type"];
    proposedBy: string; strategicObjective: string;
    dependencies?: string[]; estimatedTokens?: number;
    estimatedDuration?: string; requiredCapabilities?: string[];
  }) {
    return missionAPI.submitProposal({
      ...proposal,
      dependencies: proposal.dependencies || [],
      estimatedTokens: proposal.estimatedTokens || 5000,
      estimatedDuration: proposal.estimatedDuration || "1 sprint",
      requiredCapabilities: proposal.requiredCapabilities || [],
    });
  }

  /** Activate a mission from a proposal */
  activate(proposalId: string, assignedTo = "CEO") {
    return missionAPI.activateMission(proposalId, assignedTo);
  }

  /** Cancel a proposal */
  cancel(proposalId: string) { return missionAPI.cancelProposal(proposalId); }

  /** Get the mission board */
  getBoard(): MissionBoard { return missionAPI.getBoard(); }

  /** Get all ranked proposals */
  getRankedProposals() {
    const proposals = proposalRegistry.getAllProposals().filter(p => p.status === "PROPOSAL");
    return priorityEngine.rank(proposals);
  }

  /** Get active missions */
  getActiveMissions() { return missionAPI.getActiveMissions(); }
}

export const missionAuthority = new MissionAuthority();
