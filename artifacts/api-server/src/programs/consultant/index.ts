// ECP-030: Consultant Runtime (CKO) — public API
// Single entry point for Chief Knowledge Officer.

export { consultantRuntime } from "./consultant-runtime";
export { consultantScheduler } from "./consultant-scheduler";
export { consultantDomain } from "./consultant-provider";
export { strategicCache } from "./consultant-cache";
export { healthMonitor } from "./consultant-health";
export { kpiTracker } from "./consultant-kpi";
export { reportGenerator } from "./consultant-report";
export { formatFinding, formatRecommendation, formatWeeklyReport, formatMonthlyReport, formatProposal } from "./consultant-schema";
export type { Finding, ConsultantRecommendation, WeeklyReport, MonthlyReport, ConsultantMode, ConsultantKPI, StrategicCache } from "./consultant-types";
