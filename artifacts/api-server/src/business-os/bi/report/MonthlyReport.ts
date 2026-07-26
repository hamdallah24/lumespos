import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight } from "../types";

export class MonthlyReport {
  generate(kpis: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], health: HealthScoreResult, narratives: NarrativeInsight[]): string {
    const lines: string[] = [];
    lines.push("=".repeat(72));
    lines.push("  MONTHLY REPORT — " + new Date().toISOString().slice(0, 7));
    lines.push("=".repeat(72));
    lines.push("");

    lines.push("MONTH-OVER-MONTH COMPARISON");
    lines.push("-".repeat(40));
    for (const k of kpis.filter(k => k.period === "monthly" && k.previousValue !== undefined)) {
      const chg = ((k.value - k.previousValue!) / k.previousValue! * 100).toFixed(1);
      const arrow = k.higherIsBetter ? (k.value >= k.previousValue! ? "▲" : "▼") : (k.value <= k.previousValue! ? "▲" : "▼");
      const pct = k.targetValue !== undefined ? `(${(k.value / k.targetValue * 100).toFixed(1)}% of target)` : "";
      lines.push(`  ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} ${arrow} ${chg}% MoM ${pct}`);
    }

    lines.push("");
    lines.push("DIMENSION-BY-DIMENSION BREAKDOWN");
    lines.push("-".repeat(40));
    const dims = [...new Set(kpis.map(k => k.dimension))];
    for (const dim of dims) {
      const dimKpis = kpis.filter(k => k.dimension === dim && k.period === "monthly");
      if (dimKpis.length === 0) continue;
      const dimHealth = health.dimensions.find(d => d.dimension === dim);
      lines.push(`  ${dim.toUpperCase()} ${dimHealth ? `[Score: ${dimHealth.score.toFixed(0)} - ${dimHealth.status}]` : ""}:`);
      for (const k of dimKpis) {
        const chg = k.previousValue !== undefined && k.previousValue !== 0
          ? ((k.value - k.previousValue) / k.previousValue * 100).toFixed(1) + "%"
          : "N/A";
        lines.push(`    ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} (${chg} MoM)`);
      }
    }

    lines.push("");
    lines.push("KPI VS TARGET");
    lines.push("-".repeat(40));
    const withTarget = kpis.filter(k => k.targetValue !== undefined && k.period === "monthly");
    if (withTarget.length === 0) {
      lines.push("  No targets set for this period");
    } else {
      for (const k of withTarget) {
        const pct = (k.value / k.targetValue! * 100).toFixed(1);
        const status = k.higherIsBetter
          ? (k.value >= k.targetValue! ? "✓ Met" : "✗ Missed")
          : (k.value <= k.targetValue! ? "✓ Met" : "✗ Missed");
        lines.push(`  ${k.kpiName}: ${pct}% of target (${status})`);
      }
    }

    lines.push("");
    lines.push("ROOT CAUSES & INSIGHTS");
    lines.push("-".repeat(40));
    for (const n of narratives) {
      lines.push(`  [${n.type.toUpperCase()}] ${n.headline}`);
      lines.push(`    ${n.description}`);
      if (n.rootCauses.length > 0) {
        lines.push(`    Root Causes: ${n.rootCauses.join("; ")}`);
      }
      if (n.recommendations.length > 0) {
        lines.push(`    Recommendations: ${n.recommendations.join("; ")}`);
      }
      lines.push("");
    }

    lines.push("");
    lines.push("ALERTS THIS MONTH");
    lines.push("-".repeat(40));
    for (const a of alerts) {
      lines.push(`  [${a.severity.toUpperCase()}] ${a.kpiName}: ${a.message}`);
    }

    lines.push("");
    lines.push("=".repeat(72));
    lines.push("  End of Monthly Report");
    return lines.join("\n");
  }
}
