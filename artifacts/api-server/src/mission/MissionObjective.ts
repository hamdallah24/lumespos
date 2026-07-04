// ADR-009 Phase 0: Mission Objective
// Single objective within a mission. Has status, deliverable, acceptance criteria.

import type { MissionObjective, ObjectiveStatus } from "./Mission";

export function markObjectiveComplete(obj: MissionObjective): void {
  obj.status = "COMPLETED";
  obj.completedAt = new Date().toISOString();
}

export function markObjectiveFailed(obj: MissionObjective): void {
  obj.status = "FAILED";
  obj.completedAt = new Date().toISOString();
}

export function markObjectiveInProgress(obj: MissionObjective): void {
  if (obj.status === "PENDING") {
    obj.status = "IN_PROGRESS";
  }
}
