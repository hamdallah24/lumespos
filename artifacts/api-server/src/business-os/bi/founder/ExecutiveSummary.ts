import type { KPIValue, HealthScoreResult } from "../types";

interface SummaryEntry {
  executive: string;
  status: string;
  summary: string;
  kpiCount: number;
  alerts: number;
}

export class ExecutiveSummary {
  summarizeAll(kpis: KPIValue[], health: HealthScoreResult): SummaryEntry[] {
    const grouped = new Map<string, KPIValue[]>();
    for (const kpi of kpis) {
      const exec = kpi.executive || 'Unassigned';
      const arr = grouped.get(exec) ?? [];
      arr.push(kpi);
      grouped.set(exec, arr);
    }

    const summaries: SummaryEntry[] = [];
    for (const [executive, execKpis] of grouped) {
      const belowTarget = execKpis.filter(
        (k) => k.targetValue !== undefined && k.value < k.targetValue,
      ).length;
      const aboveTarget = execKpis.filter(
        (k) => k.targetValue !== undefined && k.value >= k.targetValue,
      ).length;
      const avgScore =
        execKpis.reduce((s, k) => s + k.value, 0) / execKpis.length;

      let status: string;
      if (avgScore >= 80) status = 'on_track';
      else if (avgScore >= 50) status = 'needs_attention';
      else status = 'critical';

      const dimStatuses = health.dimensions
        .filter((d) => execKpis.some((k) => k.dimension === d.dimension))
        .map((d) => d.status);

      const alerts = dimStatuses.filter((s) => s === 'critical' || s === 'warning').length;

      summaries.push({
        executive,
        status,
        summary: `${execKpis.length} KPIs: ${aboveTarget} on target, ${belowTarget} below target`,
        kpiCount: execKpis.length,
        alerts,
      });
    }

    return summaries;
  }

  getTopPerformer(summaries: SummaryEntry[]): string | null {
    if (summaries.length === 0) return null;
    const sorted = [...summaries].sort(
      (a, b) => b.kpiCount - a.kpiCount || a.alerts - b.alerts,
    );
    return sorted[0].executive;
  }

  getNeedsAttention(summaries: SummaryEntry[]): string[] {
    return summaries
      .filter((s) => s.status === 'critical' || s.status === 'needs_attention')
      .map((s) => s.executive);
  }
}
