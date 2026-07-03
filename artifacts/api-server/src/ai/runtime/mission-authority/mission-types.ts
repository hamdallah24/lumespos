// ECP-034: Mission Types — Proposal, Mission, Lifecycle
// Frozen. Mission Authority is the single source of truth for missions.

export type MissionLifecycle =
  "PROPOSAL" | "VALIDATION" | "PRIORITIZATION" | "APPROVAL" |
  "QUEUED" | "ACTIVE" | "COMPLETED" | "KNOWLEDGE" | "ARCHIVED";

export type MissionType =
  "strategic" | "operational" | "incident" | "maintenance" |
  "research" | "learning" | "architecture" | "knowledge" | "governance" | "compliance";

export interface MissionProposal {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  proposedBy: string;
  strategicObjective: string;
  priority: number;
  dependencies: string[];
  estimatedTokens: number;
  estimatedDuration: string;
  requiredCapabilities: string[];
  alignmentScore: number;
  conflictIds: string[];
  status: MissionLifecycle;
  createdAt: string;
  approvedBy?: string;
}

export interface MissionEntry {
  id: string;
  proposalId: string;
  title: string;
  type: MissionType;
  status: MissionLifecycle;
  assignedTo: string;
  priority: number;
  strategicObjective: string;
  dependencies: string[];
  startedAt?: string;
  completedAt?: string;
  parentMissionId?: string;
}

export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  northStarAlignment: string;
  activeMissions: string[];
  completedMissions: number;
  status: "active" | "achieved" | "archived";
}

export interface MissionBoard {
  generatedAt: string;
  pending: number;
  approved: number;
  running: number;
  blocked: number;
  completed: number;
  archived: number;
  topPriorities: MissionProposal[];
  conflicts: { proposal1: string; proposal2: string; similarity: number }[];
}
