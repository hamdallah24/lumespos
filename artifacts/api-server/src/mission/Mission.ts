// ADR-009: Mission Domain — Shared types
// Mission, Contract, Objective, State, History.

export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CHRO" | "CIO";

export type MissionState = "DRAFT" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "ARCHIVED";

export type ObjectiveStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "BLOCKED";

export interface MissionObjective {
  id: string;
  description: string;
  status: ObjectiveStatus;
  deliverable: string;
  acceptanceCriteria: string;
  evidenceRequired: number;
  completedAt?: string;
}

export interface MissionContract {
  missionId: string;
  objective: string;
  objectives: MissionObjective[];
  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  title: string;
  state: MissionState;
  contract: MissionContract;
  createdBy: ExecutiveRole;
  assignedTo: ExecutiveRole[];
  createdAt: string;
  completedAt?: string;
}

export interface MissionHistoryEntry {
  id: string;
  missionId: string;
  objectiveId: string;
  artifactId: string;
  evidenceId: string;
  decision: string;
  decidedBy: ExecutiveRole;
  timestamp: string;
}

let _missionCounter = 0;
let _historyCounter = 0;

export function createMissionId(): string { _missionCounter++; return `M-${Date.now().toString(36)}-${_missionCounter}`; }
export function createObjectiveId(missionId: string, index: number): string { return `${missionId}-obj-${index + 1}`; }
export function createHistoryId(): string { _historyCounter++; return `HIST-${Date.now().toString(36)}-${_historyCounter}`; }
