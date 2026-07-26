import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult } from "../types";

export class DailyReport {
  generate(kpis: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], health: HealthScoreResult): string {
    const lines: string[] = [];
    lines.push("=".repeat(72));
    lines.push("  DAILY REPORT — " + new Date().toISOString().slice(0, 10));
    lines.push("=".repeat(72));
    lines.push("");
    lines.push("TODAY'S HIGHLIGHTS");
    lines.push("-".repeat(40));

    const revenue = kpis.find(k => k.kpiId === "kpi_revenue" || k.kpiName.toLowerCase().includes("revenue"));
    if (revenue) {
      const direction = revenue.higherIsBetter ? (revenue.value >= (revenue.previousValue ?? 0) ? "▲" : "▼") : (revenue.value <= (revenue.previousValue ?? 0) ? "▲" : "▼");
      lines.push(`  Revenue: ${revenue.value.toLocaleString()} ${revenue.unit} ${direction}`);
      if (revenue.previousValue !== undefined) {
        const chg = ((revenue.value - revenue.previousValue) / revenue.previousValue * 100).toFixed(1);
        lines.push(`  vs Yesterday: ${chg}%`);
      }
      if (revenue.targetValue !== undefined) {
        const pct = (revenue.value / revenue.targetValue * 100).toFixed(1);
        lines.push(`  vs Target: ${pct}%`);
      }
    }

    lines.push("");
    lines.push(`Health Score: ${health.overall.toFixed(0)}/100`);
    for (const d of health.dimensions) {
      lines.push(`  ${d.dimension}: ${d.score.toFixed(0)} (${d.status})`);
    }

    lines.push("");
    lines.push("TOP ALERTS (" + alerts.length + ")");
    lines.push("-".repeat(40));
    for (const a of alerts.slice(0, 5)) {
      lines.push(`  [${a.severity.toUpperCase()}] ${a.kpiName}: ${a.message}`);
    }

    lines.push("");
    lines.push("KEY METRICS BY DIMENSION");
    lines.push("-".repeat(40));
    const dims = [...new Set(kpis.map(k => k.dimension))];
    for (const dim of dims) {
      const dimKpis = kpis.filter(k => k.dimension === dim);
      lines.push(`  ${dim.toUpperCase()}:`);
      for (const k of dimKpis) {
        lines.push(`    ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit}`);
      }
    }

    lines.push("");
    lines.push("FORECAST WARNINGS");
    lines.push("-".repeat(40));
    const warnings = forecast.filter(f => f.warnings && f.warnings.length > 0);
    if (warnings.length === 0) {
      lines.push("  No warnings");
    } else {
      for (const f of warnings) {
        lines.push(`  ${f.metric} (${f.dimension}):`);
        for (const w of f.warnings) {
          lines.push(`    ⚠ ${w}`);
        }
      }
    }

    lines.push("");
    lines.push("=".repeat(72));
    lines.push("  End of Daily Report");
    return lines.join("\n");
  }
}
