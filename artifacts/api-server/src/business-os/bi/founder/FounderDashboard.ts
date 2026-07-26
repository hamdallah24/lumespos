import type { CompanySnapshot as CompanySnapshotType, HealthScoreResult, ForecastResult, NarrativeInsight, KPIValue } from "../types";
import { CompanySnapshot } from "./CompanySnapshot";
import { CompanyHealth } from "./CompanyHealth";
import { CompanyForecast } from "./CompanyForecast";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { MissionProgress } from "./MissionProgress";

interface WorkspaceData {
  revenue?: { today: number; month: number; year: number };
  cash?: { position: number; forecast: string };
  profit?: { month: number; margin: number };
  activeObjectives?: number;
  pendingApprovals?: number;
  executiveDecisions?: number;
  councilSessions?: number;
}

export class FounderDashboard {
  snapshot: CompanySnapshot = new CompanySnapshot();
  health: CompanyHealth = new CompanyHealth();
  forecast: CompanyForecast = new CompanyForecast();
  execSummary: ExecutiveSummary = new ExecutiveSummary();
  mission: MissionProgress = new MissionProgress();

  getFullDashboard(
    kpis: KPIValue[],
    health: HealthScoreResult,
    forecasts: ForecastResult[],
    insights: NarrativeInsight[],
    workspaceData: WorkspaceData,
  ): CompanySnapshotType {
    return this.snapshot.generate(kpis, health, forecasts, insights, workspaceData);
  }

  getCompactView(kpis: KPIValue[], health: HealthScoreResult): string {
    const hSummary = this.health.getSummary(health);
    const summaries = this.execSummary.summarizeAll(kpis, health);
    const topExec = this.execSummary.getTopPerformer(summaries);
    const needsAttention = this.execSummary.getNeedsAttention(summaries);
    const trendSummary = this.health.getTrendSummary(health.dimensions);

    const lines: string[] = [
      `╔══════════════════════════════════════╗`,
      `║       FOUNDER COMMAND CENTER         ║`,
      `╠══════════════════════════════════════╣`,
      `║ Health : ${health.overall.toFixed(1)}/100 [${hSummary.level}]${" ".repeat(11)}║`,
      `║ Status : ${hSummary.color.toUpperCase()}${" ".repeat(33)}║`,
      `║ Trends : ${trendSummary.slice(0, 34)}${" ".repeat(34 - Math.min(trendSummary.length, 34))}║`,
      `║ KPIs   : ${kpis.length} total${" ".repeat(25)}║`,
      `║ Top    : ${topExec ?? 'N/A'}${" ".repeat(27 - (topExec?.length ?? 3))}║`,
      `║ Action : ${needsAttention.length} executive(s) need attention${" ".repeat(5)}║`,
    ];

    const dims = health.dimensions.slice(0, 3);
    for (const d of dims) {
      const icon = d.status === 'healthy' ? '+' : d.status === 'warning' ? '~' : '-';
      lines.push(`║  ${icon} ${d.dimension.padEnd(11)}${d.score.toFixed(1)}${" ".repeat(16)}║`);
    }

    lines.push(`╚══════════════════════════════════════╝`);
    return lines.join('\n');
  }

  formatCompanyDashboard(snapshot: CompanySnapshotType): string {
    const lines: string[] = [
      `╔══════════════════════════════════════════════════════╗`,
      `║               COMPANY DASHBOARD                      ║`,
      `╠══════════════════════════════════════════════════════╣`,
      `║ Generated : ${snapshot.timestamp.slice(0, 19)}${" ".repeat(14)}║`,
      `╠════════════════════════════════════════╤═════════════╣`,
      `║ Health Score                          │ ${snapshot.health.toFixed(1).padStart(6)}          ║`,
      `╠════════════════════════════════════════╧═════════════╣`,
      `║  Revenue                                             ║`,
      `║    Today  : $${snapshot.revenue.today.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `║    Month  : $${snapshot.revenue.month.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `║    Year   : $${snapshot.revenue.year.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `╠══════════════════════════════════════════════════════╣`,
      `║  Cash & Profit                                       ║`,
      `║    Cash Position : $${snapshot.cash.position.toLocaleString().padStart(12)}${" ".repeat(6)}║`,
      `║    Cash Forecast : ${snapshot.cash.forecast.slice(0, 18).padEnd(18)}${" ".repeat(9)}║`,
      `║    Profit Month  : $${snapshot.profit.month.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `║    Profit Margin : ${snapshot.profit.margin.toFixed(1)}%${" ".repeat(25)}║`,
      `╠══════════════════════════════════════════════════════╣`,
      `║  30-Day Forecast                                     ║`,
      `║    Revenue : $${snapshot.forecast30d.revenue.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `║    Cash    : $${snapshot.forecast30d.cash.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `║    Profit  : $${snapshot.forecast30d.profit.toLocaleString().padStart(12)}${" ".repeat(11)}║`,
      `╠══════════════════════════════════════════════════════╣`,
      `║  Operations                                          ║`,
      `║    Active Objectives : ${snapshot.activeObjectives}${" ".repeat(24)}║`,
      `║    Pending Approvals : ${snapshot.pendingApprovals}${" ".repeat(24)}║`,
      `║    Exec Decisions    : ${snapshot.executiveDecisions}${" ".repeat(24)}║`,
      `║    Council Sessions  : ${snapshot.councilSessions}${" ".repeat(24)}║`,
      `╠══════════════════════════════════════════════════════╣`,
    ];

    if (snapshot.topRisks.length > 0) {
      lines.push(`║  Top Risks                                          ║`);
      for (const r of snapshot.topRisks.slice(0, 3)) {
        const label = r.risk.slice(0, 38);
        lines.push(`║    - ${label}${" ".repeat(40 - Math.min(label.length, 38))}║`);
      }
    }

    if (snapshot.topOpportunities.length > 0) {
      lines.push(`╠══════════════════════════════════════════════════════╣`);
      lines.push(`║  Top Opportunities                                  ║`);
      for (const o of snapshot.topOpportunities.slice(0, 3)) {
        const label = o.opportunity.slice(0, 44);
        lines.push(`║    ${label}${" ".repeat(46 - Math.min(label.length, 44))}║`);
      }
    }

    if (snapshot.insights.length > 0) {
      lines.push(`╠══════════════════════════════════════════════════════╣`);
      lines.push(`║  Key Insights                                       ║`);
      for (const ins of snapshot.insights.slice(0, 5)) {
        const label = `[${ins.type}] ${ins.headline}`.slice(0, 48);
        lines.push(`║    ${label}${" ".repeat(50 - Math.min(label.length, 48))}║`);
      }
    }

    lines.push(`╚══════════════════════════════════════════════════════╝`);
    return lines.join('\n');
  }
}
