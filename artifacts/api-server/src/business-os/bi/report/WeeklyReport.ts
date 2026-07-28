import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight } from "../types";

export class WeeklyReport {
  generate(kpis: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], health: HealthScoreResult, narratives: NarrativeInsight[]): string {
    const lines: string[] = [];
    lines.push("=".repeat(72));
    lines.push("  WEEKLY REPORT — Week Ending " + new Date().toISOString().slice(0, 10));
    lines.push("=".repeat(72));
    lines.push("");

    lines.push("EXECUTIVE PERFORMANCE SUMMARY");
    lines.push("-".repeat(40));
    const execs = [...new Set(kpis.map(k => k.executive))];
    for (const exec of execs) {
      const ekpis = kpis.filter(k => k.executive === exec && k.period === "weekly");
      if (ekpis.length === 0) continue;
      lines.push(`  ${exec}:`);
      for (const k of ekpis) {
        const arrow = k.higherIsBetter ? (k.value >= (k.previousValue ?? 0) ? "▲" : "▼") : (k.value <= (k.previousValue ?? 0) ? "▲" : "▼");
        const chg = k.previousValue !== undefined && k.previousValue !== 0
          ? ((k.value - k.previousValue) / k.previousValue * 100).toFixed(1) + "%"
          : "N/A";
        lines.push(`    ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} ${arrow} (${chg})`);
      }
    }

    lines.push("");
    lines.push("WEEK-OVER-WEEK COMPARISON");
    lines.push("-".repeat(40));
    for (const k of kpis.filter(k => k.previousValue !== undefined)) {
      const chg = ((k.value - k.previousValue!) / k.previousValue! * 100).toFixed(1);
      const arrow = k.higherIsBetter ? (k.value >= k.previousValue! ? "▲" : "▼") : (k.value <= k.previousValue! ? "▲" : "▼");
      lines.push(`  ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} ${arrow} ${chg}% WoW`);
    }

    lines.push("");
    lines.push("TOP 5 RISKS");
    lines.push("-".repeat(40));
    const risks = health.topRisks.slice(0, 5);
    if (risks.length === 0) {
      lines.push("  No risks identified");
    } else {
      for (const r of risks) {
        lines.push(`  [${r.severity.toUpperCase()}] ${r.dimension}: ${r.risk}`);
      }
    }

    lines.push("");
    lines.push("TOP 5 OPPORTUNITIES");
    lines.push("-".repeat(40));
    const opps = health.topOpportunities.slice(0, 5);
    if (opps.length === 0) {
      lines.push("  No opportunities identified");
    } else {
      for (const o of opps) {
        lines.push(`  ${o.dimension}: ${o.opportunity} (Impact: ${o.impact})`);
      }
    }

    lines.push("");
    lines.push("NARRATIVE INSIGHTS");
    lines.push("-".repeat(40));
    for (const n of narratives.slice(0, 7)) {
      const tag = n.type === "positive" ? "✓" : n.type === "negative" ? "✗" : n.type === "warning" ? "⚠" : "★";
      lines.push(`  ${tag} [${n.dimension}] ${n.headline}`);
      lines.push(`    ${n.description}`);
    }

    lines.push("");
    lines.push("=".repeat(72));
    lines.push("  End of Weekly Report");
    return lines.join("\n");
  }
}
