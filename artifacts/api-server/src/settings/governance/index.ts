// ConfigCenter — Milestone 5: Governance barrel.
// Consumer-only orchestration on top of locked contracts. Approval is
// policy-driven and DIRECT by default; nothing here touches core internals.

export {
  PolicyEngine,
  POLICY_MATRIX,
  type ApprovalDecision,
  type ApprovalDecisionType,
  type PolicyTierView,
  type OperationalGate,
} from "./policy";

export {
  ChangeFreezeRegistry,
  type FreezeDefinition,
  type FreezeScopeMatch,
} from "./freeze";

export {
  MaintenanceWindowRegistry,
  type WindowDefinition,
  type WindowKind,
} from "./window";

export {
  GovernanceGateLog,
  type GateRecord,
  type GateEventType,
} from "./gates-log";

export {
  ApprovalRegistry,
  GovernanceRequestError,
  type ApprovalRequest,
  type ApprovalStatus,
  type ApproverVote,
  type ApprovalHistoryStep,
  type ApprovalQuery,
  type ApprovalPage,
} from "./approval";

export {
  ApprovalJournal,
  type ApprovalRecord,
  type ApprovalEventType,
} from "./journal";

export {
  ConfigGovernance,
  type ConfigGovernanceDeps,
  type ProposeOutcome,
  type GovernanceCounts,
  type GovernanceCalendar,
  type AttentionItem,
} from "./governance";