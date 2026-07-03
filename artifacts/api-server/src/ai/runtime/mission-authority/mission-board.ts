// ECP-034: Mission Board — dashboard of mission status
// Frozen. Aggregates all mission data into one board.

import type { MissionBoard } from "./mission-types";
import { proposalRegistry } from "./proposal-registry";

class MissionBoardBuilder {
  build(): MissionBoard {
    const proposals = proposalRegistry.getAllProposals();
    const missions = proposalRegistry.getAllMissions();

    const pending = proposals.filter(p => p.status === "PROPOSAL" || p.status === "VALIDATION").length;
    const approved = proposals.filter(p => p.status === "APPROVAL").length;
    const running = missions.filter(m => m.status === "ACTIVE").length;
    const blocked = missions.filter(m => m.status === "QUEUED").length;
    const completed = missions.filter(m => m.status === "COMPLETED").length;
    const archived = missions.filter(m => m.status === "ARCHIVED").length;

    return {
      generatedAt: new Date().toISOString(),
      pending, approved, running, blocked, completed, archived,
      topPriorities: proposals
        .filter(p => p.status === "PROPOSAL")
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5),
      conflicts: [],
    };
  }
}

export const missionBoard = new MissionBoardBuilder();
