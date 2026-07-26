import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { computeMetrics, getAllSessions, getHistoryEntries, CouncilEngine } from "../council";
import type { CouncilSession } from "../council/types";

export interface ExecutiveOverview {
  executive: string;
  taskCount: number;
  pendingTasks: number;
  completedTasks: number;
  decisionCount: number;
  objectiveCount: number;
  activeObjectives: number;
  pendingApprovals: number;
  recommendationCount: number;
  executionSuccessRate: number;
  lastActive: string;
}

export interface FounderDashboard {
  executives: ExecutiveOverview[];
  totalObjectives: number;
  activeObjectives: number;
  completedObjectives: number;
  totalKPIs: number;
  kpisOnTrack: number;
  kpisAtRisk: number;
  pendingApprovalsCount: number;
  totalDecisions: number;
  totalExecutions: number;
  totalEvents: number;
  councilSessions: number;
  recommendationsCount: number;
  pendingRecommendationsCount: number;
  overallHealth: string;
  updatedAt: string;
}

export interface DailyBrief {
  date: string;
  executive: string;
  achievements: string[];
  problems: string[];
  risks: string[];
  kpis: { name: string; value: number; target: number; unit: string; status: "on_track" | "at_risk" | "critical" }[];
  pendingTasks: number;
  pendingApprovals: number;
  topPriorities: string[];
  keyEvents: string[];
}

export class FounderWorkspace {
  getDashboard(): FounderDashboard {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    const overviews: ExecutiveOverview[] = executives.map(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      const totalExecs = ws.executions.length;
      const successExecs = ws.executions.filter(e => e.success).length;
      return {
        executive: exec,
        taskCount: ws.tasks.length,
        pendingTasks: ws.tasks.filter(t => t.status === "pending").length,
        completedTasks: ws.tasks.filter(t => t.status === "completed").length,
        decisionCount: ws.decisions.length,
        objectiveCount: ws.objectives.length,
        activeObjectives: ws.objectives.filter(o => o.status === "active").length,
        pendingApprovals: ws.approvals.filter(a => a.status === "pending").length,
        recommendationCount: ws.recommendations.length,
        executionSuccessRate: totalExecs > 0 ? Math.round(successExecs / totalExecs * 100) : 0,
        lastActive: ws.updatedAt,
      };
    });

    const allObjectives = overviews.reduce((s, o) => s + o.objectiveCount, 0);
    const activeObjectives = overviews.reduce((s, o) => s + o.activeObjectives, 0);
    const pendingApprovals = overviews.reduce((s, o) => s + o.pendingApprovals, 0);
    const totalDecisions = overviews.reduce((s, o) => s + o.decisionCount, 0);
    const pendingRecs = executives.reduce((s, e) => s + ExecutiveWorkspaceManager.getWorkspace(e).recommendations.filter(r => r.status === "pending").length, 0);
    const totalRecs = executives.reduce((s, e) => s + ExecutiveWorkspaceManager.getWorkspace(e).recommendations.length, 0);

    let councilCount = 0;
    try { councilCount = getAllSessions().length; } catch { /* not available */ }

    const allKPIs = executives.flatMap(e => ExecutiveWorkspaceManager.getWorkspace(e).kpis);
    const kpisOnTrack = allKPIs.filter(k => k.currentValue >= k.targetValue * 0.8).length;
    const kpisAtRisk = allKPIs.filter(k => k.currentValue < k.targetValue * 0.5).length;

    const health = executives.length >= 8 && activeObjectives > 0 && pendingApprovals < 10 ? "healthy" : "needs_attention";

    return {
      executives: overviews,
      totalObjectives: allObjectives,
      activeObjectives,
      completedObjectives: overviews.reduce((s, o) => s + (o.objectiveCount - o.activeObjectives), 0),
      totalKPIs: allKPIs.length,
      kpisOnTrack,
      kpisAtRisk,
      pendingApprovalsCount: pendingApprovals,
      totalDecisions,
      totalExecutions: overviews.reduce((s, o) => s + o.taskCount, 0),
      totalEvents: executives.reduce((s, e) => s + ExecutiveWorkspaceManager.getWorkspace(e).timeline.filter(t => t.type === "event").length, 0),
      councilSessions: councilCount,
      recommendationsCount: totalRecs,
      pendingRecommendationsCount: pendingRecs,
      overallHealth: health,
      updatedAt: new Date().toISOString(),
    };
  }

  getExecutiveOverview(): ExecutiveOverview[] {
    return this.getDashboard().executives;
  }

  getCompanyObjectives() {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    return executives.flatMap(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      return ws.objectives.map(obj => ({ ...obj, executive: exec }));
    });
  }

  getAllKPIs() {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    return executives.flatMap(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      return ws.kpis.map(kpi => ({ ...kpi, executive: exec }));
    });
  }

  getPendingApprovals() {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    return executives.flatMap(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      return ws.approvals.filter(a => a.status === "pending").map(a => ({ ...a, executive: exec }));
    });
  }

  getTimeline(maxEntries: number = 100) {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    const allEntries = executives.flatMap(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      return ws.timeline.map(t => ({ ...t, executive: exec }));
    });
    return allEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, maxEntries);
  }

  getCouncilSessions(): CouncilSession[] {
    try { return getAllSessions(); } catch { return []; }
  }

  getCouncilSummary() {
    try { return computeMetrics(); } catch { return null; }
  }

  getRecommendations() {
    const executives = ExecutiveWorkspaceManager.getExecutives();
    return executives.flatMap(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      return ws.recommendations.map(r => ({ ...r, executive: exec }));
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  generateDailyBrief(executive?: string): DailyBrief[] {
    const targets = executive ? [executive] : ExecutiveWorkspaceManager.getExecutives();
    return targets.map(exec => {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      const kpis = ws.kpis.map(k => ({
        name: k.name,
        value: k.currentValue,
        target: k.targetValue,
        unit: k.unit,
        status: (k.currentValue >= k.targetValue * 0.8 ? "on_track" : k.currentValue >= k.targetValue * 0.5 ? "at_risk" : "critical") as "on_track" | "at_risk" | "critical",
      }));
      return {
        date: new Date().toISOString().slice(0, 10),
        executive: exec,
        achievements: ws.snapshots.filter(s => s.date === new Date().toISOString().slice(0, 10)).flatMap(s => s.achievements),
        problems: ws.snapshots.filter(s => s.date === new Date().toISOString().slice(0, 10)).flatMap(s => s.problems),
        risks: ws.snapshots.filter(s => s.date === new Date().toISOString().slice(0, 10)).flatMap(s => s.risks),
        kpis,
        pendingTasks: ws.tasks.filter(t => t.status === "pending").length,
        pendingApprovals: ws.approvals.filter(a => a.status === "pending").length,
        topPriorities: ws.tasks.filter(t => t.status === "pending" && (t.priority === "critical" || t.priority === "high")).map(t => t.title),
        keyEvents: ws.timeline.filter(t => t.type === "event").slice(-10).map(t => t.title),
      };
    });
  }

  generateWeeklyBrief(): string {
    const dashboard = this.getDashboard();
    const lines: string[] = [];
    lines.push("Weekly Business Brief");
    lines.push(`Week of: ${new Date().toISOString().slice(0, 10)}`);
    lines.push("─".repeat(50));
    lines.push(`Health: ${dashboard.overallHealth}`);
    lines.push(`Active Objectives: ${dashboard.activeObjectives}/${dashboard.totalObjectives}`);
    lines.push(`KPIs On Track: ${dashboard.kpisOnTrack}/${dashboard.totalKPIs}`);
    lines.push(`Pending Approvals: ${dashboard.pendingApprovalsCount}`);
    lines.push(`Council Sessions: ${dashboard.councilSessions}`);
    lines.push("");
    for (const exec of dashboard.executives) {
      lines.push(`${exec.executive}: ${exec.activeObjectives} objectives, ${exec.pendingTasks} pending tasks, ${exec.executionSuccessRate}% execution rate`);
    }
    return lines.join("\n");
  }

  generateMonthlyBrief(): string {
    const dashboard = this.getDashboard();
    const lines: string[] = [];
    lines.push("Monthly Business Brief");
    lines.push(`Period: ${new Date().toISOString().slice(0, 7)}`);
    lines.push("═".repeat(50));
    lines.push(`Overall Health: ${dashboard.overallHealth}`);
    lines.push("");
    lines.push("Executive Performance:");
    for (const exec of dashboard.executives) {
      lines.push(`  ${exec.executive}`);
      lines.push(`    Decisions: ${exec.decisionCount} | Tasks: ${exec.completedTasks}/${exec.taskCount} | Success Rate: ${exec.executionSuccessRate}%`);
      lines.push(`    Objectives: ${exec.activeObjectives}/${exec.objectiveCount} | Approvals: ${exec.pendingApprovals}`);
    }
    lines.push("");
    lines.push(`Key Metrics:`);
    lines.push(`  Total Decisions: ${dashboard.totalDecisions}`);
    lines.push(`  Total Executions: ${dashboard.totalExecutions}`);
    lines.push(`  Council Sessions: ${dashboard.councilSessions}`);
    lines.push(`  Recommendations Pending: ${dashboard.pendingRecommendationsCount}/${dashboard.recommendationsCount}`);
    return lines.join("\n");
  }
}
