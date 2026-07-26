import { NarrativeInsight } from "../types";

export class ExecutiveNarrative {
  generateForExecutive(
    executive: string,
    insights: NarrativeInsight[]
  ): { headline: string; body: string; keyMetrics: string; actionsRequired: string } {
    const relevant = insights.filter((i) => i.dimension);
    const total = relevant.length;
    const positives = relevant.filter((i) => i.type === "positive").length;
    const negatives = relevant.filter((i) => i.type === "negative").length;

    const headline = `Ringkasan Eksekutif untuk ${executive}: ${positives} positif, ${negatives} negatif dari ${total} insight`;

    let body = `Selama periode ini, ${executive} memiliki ${total} insight signifikan.\n`;
    if (positives > 0)
      body += `Terdapat ${positives} insight positif yang menunjukkan area pertumbuhan.\n`;
    if (negatives > 0)
      body += `${negatives} insight negatif memerlukan perhatian segera.\n`;

    const metrics = relevant
      .slice(0, 5)
      .map((i) => `• ${i.headline} (confidence: ${(i.confidence * 100).toFixed(0)}%)`)
      .join("\n");

    const actionItems = relevant
      .filter((i) => i.type === "negative" || i.type === "warning")
      .slice(0, 3)
      .map((i) => `• [${i.type.toUpperCase()}] ${i.headline}`)
      .join("\n");

    return {
      headline,
      body,
      keyMetrics: metrics || "Tidak ada metrik utama.",
      actionsRequired: actionItems || "Tidak ada tindakan yang diperlukan saat ini.",
    };
  }

  formatNarrative(
    headline: string,
    body: string,
    metrics: string,
    actions: string
  ): string {
    return [
      `=== ${headline} ===`,
      "",
      body,
      "",
      "--- Metrik Utama ---",
      metrics,
      "",
      "--- Tindakan yang Diperlukan ---",
      actions,
      "",
      `Dihasilkan: ${new Date().toISOString()}`,
    ].join("\n");
  }
}
