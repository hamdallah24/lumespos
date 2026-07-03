// ECP-032.5: Observability — public API
// Single entry point for organizational telemetry.

export { telemetry } from "./telemetry";
export { eventBus } from "./event-bus";
export { decisionRegistry } from "./decision-registry";
export { runtimeMetrics } from "./runtime-metrics";
export { missionTimeline } from "./timeline";
export { dashboard } from "./organization-dashboard";
export { startTrace, startSpan, endSpan, completeTrace, getTrace, getRecentTraces } from "./trace-manager";
export type { TraceSpan, TraceRecord, DecisionEntry, RuntimeKPISnapshot, MissionTimeline, OrganizationDashboard } from "./types";
