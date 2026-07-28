import { NarrativeInsight, ForecastResult } from "../types";

export class FounderNarrative {
  generate(
    insights: NarrativeInsight[],
    health: { overall: number },
    forecast: ForecastResult[]
  ): {
    headline: string;
    keyHighlights: string[];
    topConcerns: string[];
    opportunities: string[];
    threeThings: string[];
  } {
    const positives = insights.filter((i) => i.type === "positive" || i.type === "opportunity");
    const negatives = insights.filter((i) => i.type === "negative");
    const warnings = insights.filter((i) => i.type === "warning");
    const opportunities = insights.filter((i) => i.type === "opportunity");

    const headline = `Health Score: ${health.overall} | ${positives.length} positif, ${negatives.length} negatif, ${warnings.length} peringatan`;

    const keyHighlights = positives.slice(0, 5).map((i) => i.headline);

    const topConcerns = negatives.slice(0, 5).map((i) => i.headline);

    const opps = opportunities.slice(0, 3).map((i) => i.headline);

    const threeThings = [
      ...negatives.slice(0, 1).map((i) => `Segera tangani: ${i.headline}`),
      ...positives.slice(0, 1).map((i) => `Optimalkan: ${i.headline}`),
      forecast.length > 0
        ? `Proyeksi: ${forecast[0].metric} diproyeksikan ${forecast[0].forecast30d > forecast[0].currentValue ? "naik" : "turun"} dalam 30 hari`
        : "Review data untuk insight lebih lanjut",
    ];

    return {
      headline,
      keyHighlights,
      topConcerns,
      opportunities: opps,
      threeThings,
    };
  }

  formatBriefing(result: {
    headline: string;
    keyHighlights: string[];
    topConcerns: string[];
    opportunities: string[];
    threeThings: string[];
  }): string {
    const sections = [
      `=== FOUNDER BRIEFING ===`,
      "",
      result.headline,
      "",
      "--- Key Highlights ---",
      result.keyHighlights.map((h) => `  • ${h}`).join("\n"),
      "",
      "--- Top Concerns ---",
      result.topConcerns.map((c) => `  • ${c}`).join("\n"),
      "",
      "--- Opportunities ---",
      (result.opportunities.length ? result.opportunities : ["Tidak ada peluang teridentifikasi"])
        .map((o) => `  • ${o}`).join("\n"),
      "",
      "--- 3 Things to Focus On ---",
      result.threeThings.map((t, i) => `  ${i + 1}. ${t}`).join("\n"),
      "",
      `Dihasilkan: ${new Date().toISOString()}`,
    ];

    return sections.join("\n");
  }
}
