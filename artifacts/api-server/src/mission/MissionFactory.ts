// ADR-009 Phase 0: Mission Factory
// Pure data transformation. NO reasoning. NO LLM calls.
// CEO Runtime provides the reasoning output; Factory converts to struct.

import type { ExecutiveRole, Mission, MissionContract } from "./Mission";
import { createMissionId } from "./Mission";
import { createMissionContract } from "./MissionContract";

export interface MissionInput {
  objective: string;
  subObjectives: string[];
  createdBy: ExecutiveRole;
  assignedTo: ExecutiveRole[];
}

export function createMission(input: MissionInput): Mission {
  const id = createMissionId();
  const contract = createMissionContract(id, input.objective, input.subObjectives);

  return {
    id,
    title: input.objective.slice(0, 80),
    state: "DRAFT",
    contract,
    createdBy: input.createdBy,
    assignedTo: input.assignedTo,
    createdAt: new Date().toISOString(),
  };
}
