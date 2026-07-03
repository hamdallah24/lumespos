// ECP-033: Participant Engine — selects council members per decision type
// Frozen. Different decisions require different participants.

import type { CouncilParticipant } from "./types";
import type { DecisionTrigger } from "./types";
import { getCouncilPolicy, COUNCIL_RUNTIME_WEIGHTS } from "./council-policy";

class ParticipantEngine {
  select(trigger: DecisionTrigger): CouncilParticipant[] {
    const policy = getCouncilPolicy(trigger);
    return policy.requiredParticipants.map(runtime => ({
      runtime,
      role: runtime as CouncilParticipant["role"],
      weight: COUNCIL_RUNTIME_WEIGHTS[runtime] || 0.5,
      status: "pending",
    }));
  }

  getWeight(runtime: string): number {
    return COUNCIL_RUNTIME_WEIGHTS[runtime] || 0.5;
  }

  isRequired(runtime: string, trigger: DecisionTrigger): boolean {
    const policy = getCouncilPolicy(trigger);
    return policy.requiredParticipants.includes(runtime);
  }
}

export const participantEngine = new ParticipantEngine();
