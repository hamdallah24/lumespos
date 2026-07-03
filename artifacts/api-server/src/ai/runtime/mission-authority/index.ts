// ECP-034: Mission Authority — public API
// Single source of truth for all mission operations.

export { missionAuthority } from "./mission-authority";
export { missionAPI } from "./mission-api";
export { proposalRegistry } from "./proposal-registry";
export { conflictDetector } from "./conflict-detector";
export { alignmentEngine } from "./alignment-engine";
export { priorityEngine } from "./priority-engine";
export { approvalPolicy } from "./approval-policy";
export { missionBoard } from "./mission-board";
export type { MissionProposal, MissionEntry, MissionLifecycle, MissionType, StrategicObjective, MissionBoard as MissionBoardType } from "./mission-types";
