export { ExecutiveWorkspaceManager } from "./ExecutiveWorkspaceManager";
export * as Repository from "./WorkspaceRepository";
export { toMemoryContext, serializeWorkspace, deserializeWorkspace } from "./WorkspaceSerializer";
export { generateSnapshot } from "./WorkspaceSnapshot";
export { generateSummary } from "./WorkspaceSummary";
export { formatTimeline, aggregateTimelineByHour } from "./WorkspaceTimeline";
export { computeMetrics, updateKPI, createKPI, DEFAULT_KPIS } from "./WorkspaceMetrics";
export { createObjective, DEFAULT_OBJECTIVES } from "./WorkspaceObjective";
export { createTask, generateTasksFromEvent } from "./WorkspaceTask";
export { createRecommendation } from "./WorkspaceRecommendation";
export { createApprovalItem } from "./WorkspaceApproval";
export { createReminder, DEFAULT_REMINDERS } from "./WorkspaceReminder";
export type {
  ExecutiveWorkspaceState, Objective, Task, Recommendation, ApprovalItem,
  Reminder, DecisionEntry, ExecutionEntry, DiscussionEntry, TimelineEntry,
  KPIDefinition, Snapshot, WorkspaceMetricsData,
} from "./WorkspaceTypes";
export type { SummaryPeriod, WorkspaceSummaryResult } from "./WorkspaceSummary";
