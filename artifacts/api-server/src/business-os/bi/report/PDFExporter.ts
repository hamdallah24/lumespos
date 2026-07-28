export class PDFExporter {
  export(
    reportTitle: string,
    sections: { title: string; content: string }[],
    options?: { includeTimestamp?: boolean; includeWatermark?: boolean }
  ): string {
    const lines: string[] = [];
    const timestamp = options?.includeTimestamp ?? true;
    const watermark = options?.includeWatermark ?? false;

    lines.push("\u2500".repeat(72));
    lines.push(`  ${reportTitle.toUpperCase()}`);
    lines.push("\u2500".repeat(72));

    if (timestamp) {
      lines.push(`  Generated: ${new Date().toISOString()}`);
      lines.push("");
    }

    if (watermark) {
      lines.push("  [CONFIDENTIAL — INTERNAL USE ONLY]");
      lines.push("");
    }

    for (const section of sections) {
      lines.push("");
      lines.push(section.title);
      lines.push("\u2500".repeat(section.title.length));
      lines.push(section.content);
    }

    lines.push("");
    lines.push("\u2500".repeat(72));
    lines.push("  End of PDF Export");

    if (watermark) {
      lines.push("");
      lines.push("  WATERMARK: DRAFT — NOT FOR DISTRIBUTION");
    }

    return lines.join("\n");
  }

  addTable(headers: string[], rows: string[][]): string {
    if (headers.length === 0) return "";

    const colWidths = headers.map((h, i) => {
      const maxData = rows.reduce((max, row) => (row[i]?.length ?? 0) > max ? (row[i]?.length ?? 0) : max, 0);
      return Math.max(h.length, maxData) + 2;
    });

    const separator = "+" + colWidths.map(w => "\u2500".repeat(w)).join("+") + "+";

    const formatRow = (cells: string[]): string =>
      "|" + cells.map((c, i) => " " + c.padEnd(colWidths[i] - 1)).join("|") + "|";

    const result: string[] = [];
    result.push(separator);
    result.push(formatRow(headers));
    result.push(separator.replace(/\u2500/g, "\u2501"));

    for (const row of rows) {
      result.push(formatRow(row));
      result.push(separator);
    }

    return result.join("\n");
  }
}
