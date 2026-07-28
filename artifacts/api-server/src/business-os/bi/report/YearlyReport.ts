import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight } from "../types";

export class YearlyReport {
  generate(kpis: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], health: HealthScoreResult, narratives: NarrativeInsight[]): string {
    const lines: string[] = [];
    lines.push("=".repeat(72));
    lines.push("  YEARLY REPORT — " + new Date().getFullYear());
    lines.push("=".repeat(72));
    lines.push("");

    lines.push("ANNUAL PERFORMANCE OVERVIEW");
    lines.push("-".repeat(40));
    const annual = kpis.filter(k => k.period === "yearly");
    for (const k of annual) {
      const chg = k.previousValue !== undefined && k.previousValue !== 0
        ? ((k.value - k.previousValue) / k.previousValue * 100).toFixed(1)
        : "N/A";
      const arrow = k.higherIsBetter ? (k.value >= (k.previousValue ?? 0) ? "▲" : "▼") : (k.value <= (k.previousValue ?? 0) ? "▲" : "▼");
      lines.push(`  ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} ${arrow} ${chg}% YoY`);
    }

    lines.push("");
    lines.push("COMPOUND ANNUAL GROWTH RATE (CAGR)");
    lines.push("-".repeat(40));
    for (const k of annual) {
      if (k.previousValue !== undefined && k.previousValue !== 0) {
        const cagr = (Math.pow(k.value / k.previousValue, 1) - 1) * 100;
        lines.push(`  ${k.kpiName}: ${cagr.toFixed(2)}% CAGR`);
      }
    }

    lines.push("");
    lines.push("TREND PER DIMENSION");
    lines.push("-".repeat(40));
    const dims = [...new Set(kpis.map(k => k.dimension))];
    for (const dim of dims) {
      const dimKpis = kpis.filter(k => k.dimension === dim && k.period === "yearly");
      if (dimKpis.length === 0) continue;
      const dimHealth = health.dimensions.find(d => d.dimension === dim);
      const trendIcon = dimHealth?.trend === "up" ? "▲" : dimHealth?.trend === "down" ? "▼" : "—";
      lines.push(`  ${dim.toUpperCase()} ${trendIcon} ${dimHealth ? `(${dimHealth.score.toFixed(0)}/100)` : ""}:`);
      for (const k of dimKpis) {
        const chg = k.previousValue !== undefined && k.previousValue !== 0
          ? ((k.value - k.previousValue) / k.previousValue * 100).toFixed(1) + "% YoY"
          : "N/A";
        lines.push(`    ${k.kpiName}: ${k.value.toLocaleString()} ${k.unit} (${chg})`);
      }
    }

    lines.push("");
    lines.push("KEY ACHIEVEMENTS");
    lines.push("-".repeat(40));
    const achievements = narratives.filter(n => n.type === "positive");
    if (achievements.length === 0) {
      lines.push("  No achievements recorded");
    } else {
      for (const a of achievements) {
        lines.push(`  ✓ ${a.headline}`);
        lines.push(`    ${a.description}`);
        if (a.metrics.length > 0) {
          lines.push(`    Metrics: ${a.metrics.map(m => `${m.name}: ${m.value} (${m.change > 0 ? "+" : ""}${m.change})`).join(", ")}`);
        }
      }
    }

    lines.push("");
    lines.push("LESSONS LEARNED");
    lines.push("-".repeat(40));
    const lessons = narratives.filter(n => n.type === "negative" || n.type === "warning");
    if (lessons.length === 0) {
      lines.push("  No lessons documented");
    } else {
      for (const l of lessons) {
        lines.push(`  ✗ ${l.headline}`);
        lines.push(`    ${l.description}`);
        if (l.rootCauses.length > 0) {
          lines.push(`    Root Causes: ${l.rootCauses.join("; ")}`);
        }
        if (l.recommendations.length > 0) {
          lines.push(`    Recommendation: ${l.recommendations.join("; ")}`);
        }
      }
    }

    lines.push("");
    lines.push("NEXT YEAR STRATEGIC PLAN");
    lines.push("-".repeat(40));
    for (const f of forecast) {
      lines.push(`  ${f.metric} (${f.dimension}):`);
      lines.push(`    Forecast 365d: ${f.forecast365d.toLocaleString()}`);
      lines.push(`    Confidence: ${(f.confidence * 100).toFixed(0)}%`);
    }
    for (const n of narratives.filter(n => n.type === "opportunity")) {
      lines.push(`  ★ ${n.headline}`);
      if (n.recommendations.length > 0) {
        lines.push(`    Plan: ${n.recommendations.join("; ")}`);
      }
    }

    lines.push("");
    lines.push("=".repeat(72));
    lines.push("  End of Yearly Report");
    return lines.join("\n");
  }
}
