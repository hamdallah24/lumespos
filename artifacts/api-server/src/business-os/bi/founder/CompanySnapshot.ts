import type { CompanySnapshot as CompanySnapshotType, HealthScoreResult, ForecastResult, NarrativeInsight, KPIValue } from "../types";

interface WorkspaceData {
  revenue?: { today: number; month: number; year: number };
  cash?: { position: number; forecast: string };
  profit?: { month: number; margin: number };
  activeObjectives?: number;
  pendingApprovals?: number;
  executiveDecisions?: number;
  councilSessions?: number;
}

export class CompanySnapshot {
  generate(
    kpis: KPIValue[],
    health: HealthScoreResult,
    forecast: ForecastResult[],
    insights: NarrativeInsight[],
    workspaceData: WorkspaceData,
  ): CompanySnapshotType {
    const rev30 = forecast.find((f) => f.dimension === "finance" && f.metric === "revenue");
    const cash30 = forecast.find((f) => f.dimension === "finance" && f.metric === "cash");
    const profit30 = forecast.find((f) => f.dimension === "finance" && f.metric === "profit");

    return {
      timestamp: new Date().toISOString(),
      health: health.overall,
      revenue: {
        today: workspaceData.revenue?.today ?? 0,
        month: workspaceData.revenue?.month ?? 0,
        year: workspaceData.revenue?.year ?? 0,
      },
      cash: {
        position: workspaceData.cash?.position ?? 0,
        forecast: workspaceData.cash?.forecast ?? "N/A",
      },
      profit: {
        month: workspaceData.profit?.month ?? 0,
        margin: workspaceData.profit?.margin ?? 0,
      },
      topRisks: health.topRisks.map((r) => ({ risk: r.risk, severity: r.severity })),
      topOpportunities: health.topOpportunities.map((o) => ({ opportunity: o.opportunity, impact: o.impact })),
      activeObjectives: workspaceData.activeObjectives ?? 0,
      pendingApprovals: workspaceData.pendingApprovals ?? 0,
      executiveDecisions: workspaceData.executiveDecisions ?? 0,
      councilSessions: workspaceData.councilSessions ?? 0,
      forecast30d: {
        revenue: rev30?.forecast30d ?? 0,
        cash: cash30?.forecast30d ?? 0,
        profit: profit30?.forecast30d ?? 0,
      },
      insights,
    };
  }
}
