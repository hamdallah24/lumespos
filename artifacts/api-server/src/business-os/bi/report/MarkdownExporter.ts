import type { KPIValue, KPIAlert } from "../types";

export class MarkdownExporter {
  export(reportTitle: string, sections: { title: string; content: string; level?: number }[]): string {
    const lines: string[] = [];
    lines.push(`# ${reportTitle}`);
    lines.push("");
    lines.push(`*Generated: ${new Date().toISOString()}*`);
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const section of sections) {
      const level = section.level ?? 2;
      const prefix = "#".repeat(level);
      lines.push(`${prefix} ${section.title}`);
      lines.push("");
      lines.push(section.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    return lines.join("\n");
  }

  kpiTable(values: KPIValue[]): string {
    if (values.length === 0) return "*No KPI data available*";

    const headers = ["KPI", "Value", "Unit", "Previous", "Change", "vs Target"];
    const rows = values.map(v => {
      const chg = v.previousValue !== undefined && v.previousValue !== 0
        ? ((v.value - v.previousValue) / v.previousValue * 100).toFixed(1) + "%"
        : "N/A";
      const vsTarget = v.targetValue !== undefined
        ? (v.value / v.targetValue * 100).toFixed(1) + "%"
        : "—";
      return [v.kpiName, v.value.toLocaleString(), v.unit, v.previousValue?.toLocaleString() ?? "—", chg, vsTarget];
    });

    const headerRow = "| " + headers.join(" | ") + " |";
    const sepRow = "| " + headers.map(() => "---").join(" | ") + " |";
    const dataRows = rows.map(r => "| " + r.join(" | ") + " |");

    return [headerRow, sepRow, ...dataRows].join("\n");
  }

  alertList(alerts: KPIAlert[]): string {
    if (alerts.length === 0) return "*No alerts*";
    return alerts.map(a => `- **[${a.severity.toUpperCase()}]** ${a.kpiName}: ${a.message}`).join("\n");
  }

  healthBadge(score: number): string {
    if (score >= 80) return `![Health: ${score.toFixed(0)}/100](https://img.shields.io/badge/health-${score.toFixed(0)}-green)`;
    if (score >= 50) return `![Health: ${score.toFixed(0)}/100](https://img.shields.io/badge/health-${score.toFixed(0)}-yellow)`;
    return `![Health: ${score.toFixed(0)}/100](https://img.shields.io/badge/health-${score.toFixed(0)}-red)`;
  }
}
