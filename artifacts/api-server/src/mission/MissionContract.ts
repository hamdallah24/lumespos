// ADR-009 Phase 0: Mission Contract
// Immutable contract defining mission objectives, deliverables, and acceptance criteria.

import type { MissionContract, MissionObjective } from "./Mission";

export function createMissionContract(missionId: string, objective: string, subObjectives: string[]): MissionContract {
  const objectives: MissionObjective[] = subObjectives.map((desc, i) => ({
    id: `${missionId}-obj-${i + 1}`,
    description: desc,
    status: "PENDING" as const,
    deliverable: `Evidence for: ${desc.slice(0, 60)}`,
    acceptanceCriteria: `Verified output matching: ${desc.slice(0, 60)}`,
    evidenceRequired: 1,
  }));

  return {
    missionId,
    objective,
    objectives,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
