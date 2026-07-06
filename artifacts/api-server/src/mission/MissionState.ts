// @deprecated — ADR-010. Not wired. Logic duplicated in mission-engine.ts.
// Scheduled for review in ECP-050.
// Mission lifecycle: DRAFT → ACTIVE → BLOCKED → COMPLETED → ARCHIVED

import type { MissionState } from "./Mission";

const validTransitions: Record<MissionState, MissionState[]> = {
  DRAFT:     ["ACTIVE", "ARCHIVED"],
  ACTIVE:    ["BLOCKED", "COMPLETED"],
  BLOCKED:   ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED:  [],
};

export function canTransition(from: MissionState, to: MissionState): boolean {
  return validTransitions[from]?.includes(to) || false;
}

export function isTerminal(state: MissionState): boolean {
  return state === "COMPLETED" || state === "ARCHIVED";
}
