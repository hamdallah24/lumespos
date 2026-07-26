import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight } from "../types";

export class QuarterlyReport {
  generate(kpis: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], health: HealthScoreResult, narratives: NarrativeInsight[]): string {
    const lines: string[] = [];
    lines.push("=".repeat(72));
    lines.push("  QUARTERLY REPORT — Q" + Math.ceil(new Date().getMonth() / 3) + " " + new Date().getFullYear());
    lines.push("=".repeat(72));
    lines.push("");

    lines.push("QUARTER-OVER-QUARTER COMPARISON");
    lines.push("-".repeat(40));
    for (const k of kpis.filter(k => k.period === "quarterly" && k.previousValue !== undefined)) {
      const chg = ((k.value - k.previousValue!) / k.previousValue! * 100).toFixed(1);
      const arrow = k.higherIsBetter ? (k.value >= k.previousValue! ? "▲" : "▼") : (k.value <= k.previousValue! ? "▲" : "▼");
      lines.push(`  ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} ${arrow} ${chg}% QoQ`);
    }

    lines.push("");
    lines.push("YEAR-OVER-YEAR COMPARISON");
    lines.push("-".repeat(40));
    for (const k of kpis.filter(k => k.period === "quarterly" && k.previousValue !== undefined)) {
      const chg = ((k.value - k.previousValue!) / k.previousValue! * 100).toFixed(1);
      lines.push(`  ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} (${chg}% vs same quarter last year)`);
    }

    lines.push("");
    lines.push("STRATEGIC INITIATIVES PROGRESS");
    lines.push("-".repeat(40));
    for (const n of narratives.filter(n => n.type === "opportunity")) {
      lines.push(`  ★ ${n.headline}`);
      lines.push(`    ${n.description}`);
      if (n.recommendations.length > 0) {
        lines.push(`    Next Steps: ${n.recommendations.join("; ")}`);
      }
    }

    lines.push("");
    lines.push("COUNCIL SUMMARY");
    lines.push("-".repeat(40));
    lines.push(`  Overall Health: ${health.overall.toFixed(0)}/100`);
    for (const d of health.dimensions) {
      const trendIcon = d.trend === "up" ? "▲" : d.trend === "down" ? "▼" : "—";
      lines.push(`  ${d.dimension}: ${d.score.toFixed(0)} ${trendIcon} (${d.status})`);
    }

    lines.push("");
    lines.push("KEY RISKS & MITIGATIONS");
    lines.push("-".repeat(40));
    for (const r of health.topRisks) {
      lines.push(`  [${r.severity.toUpperCase()}] ${r.dimension}: ${r.risk}`);
    }

    lines.push("");
    lines.push("NEXT QUARTER OUTLOOK");
    lines.push("-".repeat(40));
    for (const f of forecast.filter(f => f.dimension === "sales" || f.dimension === "finance")) {
      lines.push(`  ${f.metric}:`);
      lines.push(`    Next 90d Forecast: ${f.forecast90d.toLocaleString()}`);
      lines.push(`    Confidence: ${(f.confidence * 100).toFixed(0)}%`);
      lines.push(`    Trend: ${f.trend}`);
      if (f.warnings.length > 0) {
        for (const w of f.warnings) {
          lines.push(`    ⚠ ${w}`);
        }
      }
    }

    lines.push("");
    lines.push("NARRATIVE HIGHLIGHTS");
    lines.push("-".repeat(40));
    for (const n of narratives) {
      const tag = n.type === "positive" ? "✓" : n.type === "negative" ? "✗" : n.type === "warning" ? "⚠" : "★";
      lines.push(`  ${tag} ${n.headline}`);
    }

    lines.push("");
    lines.push("=".repeat(72));
    lines.push("  End of Quarterly Report");
    return lines.join("\n");
  }
}
