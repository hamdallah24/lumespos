import { NarrativeInsight } from "../types";

export class RecommendationGenerator {
  generateFromInsights(
    insights: NarrativeInsight[]
  ): { insight: string; recommendation: string; priority: string; impact: string }[] {
    return insights.map((i) => {
      const priority =
        i.type === "negative"
          ? "high"
          : i.type === "warning"
            ? "medium"
            : "low";
      const impact =
        i.type === "positive"
          ? "positive"
          : i.type === "opportunity"
            ? "positive"
            : "negative";

      const rec = this._buildRecommendation(i);

      return {
        insight: i.headline,
        recommendation: rec,
        priority,
        impact,
      };
    });
  }

  getPriorityActions(
    insights: NarrativeInsight[]
  ): { action: string; reasoning: string; expectedOutcome: string }[] {
    const sorted = [...insights].sort((a, b) => {
      const order: Record<string, number> = { negative: 0, warning: 1, opportunity: 2, positive: 3 };
      return order[a.type] - order[b.type];
    });

    return sorted.slice(0, 5).map((i) => ({
      action: this._buildRecommendation(i),
      reasoning: `${i.headline} — ${i.description}`,
      expectedOutcome: `Mengatasi ${i.type} issue di dimensi ${i.dimension}`,
    }));
  }

  generateRecommendationsForExecutive(executive: string, insights: NarrativeInsight[]): string[] {
    return insights
      .filter((i) => i.recommendations.length > 0)
      .flatMap((i) => i.recommendations)
      .slice(0, 10);
  }

  private _buildRecommendation(insight: NarrativeInsight): string {
    if (insight.recommendations.length > 0) return insight.recommendations[0];

    const base: Record<string, string> = {
      positive: `Pertahankan performa positif pada ${insight.dimension}. Evaluasi faktor pendorong untuk direplikasi ke dimensi lain.`,
      negative: `Lakukan investigasi mendalam terhadap penurunan di ${insight.dimension}. Identifikasi akar masalah dan buat rencana aksi korektif.`,
      warning: `Pantau indikator ${insight.dimension} secara ketat. Siapkan langkah mitigasi jika tren berlanjut.`,
      opportunity: `Manfaatkan peluang di ${insight.dimension}. Alokasikan sumber daya untuk mengoptimalkan potensi pertumbuhan.`,
    };

    return base[insight.type] ?? "Tidak ada rekomendasi spesifik.";
  }
}
