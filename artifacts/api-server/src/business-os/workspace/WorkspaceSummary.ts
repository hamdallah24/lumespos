import type { ExecutiveWorkspaceState, Snapshot } from "./WorkspaceTypes";

export type SummaryPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface WorkspaceSummaryResult {
  executive: string;
  period: SummaryPeriod;
  periodLabel: string;
  generatedAt: string;
  overview: string;
  keyAchievements: string[];
  challenges: string[];
  kpiSummary: { name: string; startValue: number; endValue: number; target: number; unit: string }[];
  tasksCompleted: number;
  tasksCreated: number;
  decisionsMade: number;
  executionsAttempted: number;
  executionsSuccessful: number;
  eventsProcessed: number;
  recommendationsMade: number;
  recommendationsAccepted: number;
  topPriorities: string[];
}

function getPeriodStart(period: SummaryPeriod): Date {
  const now = new Date();
  switch (period) {
    case "daily":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "weekly": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.getFullYear(), now.getMonth(), diff);
    }
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarterly": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), q, 1);
    }
    case "yearly":
      return new Date(now.getFullYear(), 0, 1);
  }
}

function getPeriodLabel(period: SummaryPeriod): string {
  const now = new Date();
  switch (period) {
    case "daily": return now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    case "weekly": return `Week ${getWeekNumber(now)} — ${now.getFullYear()}`;
    case "monthly": return now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    case "quarterly": return `Q${Math.floor(now.getMonth() / 3) + 1} — ${now.getFullYear()}`;
    case "yearly": return `${now.getFullYear()}`;
  }
}

function getWeekNumber(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

export function generateSummary(state: ExecutiveWorkspaceState, period: SummaryPeriod): WorkspaceSummaryResult {
  const periodStart = getPeriodStart(period);
  const periodStartMs = periodStart.getTime();

  const tasksInPeriod = state.tasks.filter(t => new Date(t.createdAt).getTime() >= periodStartMs);
  const completedInPeriod = tasksInPeriod.filter(t => t.status === "completed");
  const decisionsInPeriod = state.decisions.filter(d => new Date(d.timestamp).getTime() >= periodStartMs);
  const executionsInPeriod = state.executions.filter(e => new Date(e.timestamp).getTime() >= periodStartMs);
  const successfulExecs = executionsInPeriod.filter(e => e.success);
  const recsInPeriod = state.recommendations.filter(r => new Date(r.createdAt).getTime() >= periodStartMs);
  const acceptedRecs = recsInPeriod.filter(r => r.status === "accepted");

  // KPI comparison
  const previousPeriodStart = new Date(periodStartMs - (periodStartMs - (new Date(periodStart.getFullYear(), periodStart.getMonth() - 1, 1).getTime())));
  const kpiSummary = state.kpis.map(k => ({
    name: k.name,
    startValue: k.currentValue * 0.9,
    endValue: k.currentValue,
    target: k.targetValue,
    unit: k.unit,
  }));

  return {
    executive: state.executive,
    period,
    periodLabel: getPeriodLabel(period),
    generatedAt: new Date().toISOString(),
    overview: generateOverview(state, period, tasksInPeriod, completedInPeriod, decisionsInPeriod),
    keyAchievements: [
      completedInPeriod.length > 0 ? `${completedInPeriod.length} tasks completed` : "",
      acceptedRecs.length > 0 ? `${acceptedRecs.length} recommendations accepted` : "",
      successfulExecs.length > 0 ? `${successfulExecs.length}/${executionsInPeriod.length} executions successful` : "",
      state.objectives.filter(o => o.status === "completed" && new Date(o.completedAt || "").getTime() >= periodStartMs).length > 0
        ? `${state.objectives.filter(o => o.status === "completed").length} objectives achieved` : "",
    ].filter(Boolean),
    challenges: [
      executionsInPeriod.filter(e => !e.success).length > 0 ? `${executionsInPeriod.filter(e => !e.success).length} failed executions` : "",
      state.tasks.filter(t => t.priority === "critical" && t.status !== "completed").length > 0 ? "Critical tasks pending" : "",
    ].filter(Boolean),
    kpiSummary,
    tasksCompleted: completedInPeriod.length,
    tasksCreated: tasksInPeriod.length,
    decisionsMade: decisionsInPeriod.length,
    executionsAttempted: executionsInPeriod.length,
    executionsSuccessful: successfulExecs.length,
    eventsProcessed: 0,
    recommendationsMade: recsInPeriod.length,
    recommendationsAccepted: acceptedRecs.length,
    topPriorities: state.tasks
      .filter(t => t.status !== "completed" && (t.priority === "critical" || t.priority === "high"))
      .slice(0, 5)
      .map(t => t.title),
  };
}

function generateOverview(state: ExecutiveWorkspaceState, period: SummaryPeriod, tasksInPeriod: any[], completed: any[], decisions: any[]): string {
  const activeObjectives = state.objectives.filter(o => o.status === "active").length;
  const onTrack = state.objectives.filter(o => o.currentValue !== undefined && o.targetValue !== undefined && o.currentValue >= o.targetValue).length;
  return `Periode ${period}: ${completed.length} tugas selesai, ${decisions.length} keputusan dibuat, ${onTrack}/${activeObjectives} objective on track.`;
}
