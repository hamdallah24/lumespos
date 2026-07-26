import { NarrativeInsight, KPIValue } from "../types";

export class InsightTrace {
  trace(insight: NarrativeInsight): { rootData: string[]; derivation: string; confidence: number } {
    const rootData = [
      ...insight.metrics.map((m) => `${m.name}: ${m.value} (change: ${m.change.toFixed(2)}%)`),
      ...insight.rootCauses,
    ];

    const derivation = `Insight "${insight.headline}" diturunkan dari ${insight.metrics.length} metrik di dimensi ${insight.dimension}. Tipe: ${insight.type}. ${insight.rootCauses.length ? `Akar masalah: ${insight.rootCauses.join(", ")}` : "Tidak ada akar masalah terdokumentasi."}`;

    return {
      rootData: rootData.length ? rootData : ["Tidak ada data akar tersedia"],
      derivation,
      confidence: insight.confidence,
    };
  }

  formatTrace(trace: { rootData: string[]; derivation: string; confidence: number }): string {
    return [
      "=== Insight Trace ===",
      "",
      `Derivation: ${trace.derivation}`,
      "",
      "Root Data:",
      trace.rootData.map((d) => `  • ${d}`).join("\n"),
      "",
      `Confidence: ${(trace.confidence * 100).toFixed(0)}%`,
    ].join("\n");
  }

  verify(insight: NarrativeInsight, kpis: KPIValue[]): boolean {
    const matchingKpis = kpis.filter((k) =>
      insight.metrics.some((m) => m.name === k.kpiName || m.name === k.kpiId)
    );

    if (matchingKpis.length === 0) return false;

    const matches = matchingKpis.every((kpi) => {
      const metric = insight.metrics.find(
        (m) => m.name === kpi.kpiName || m.name === kpi.kpiId
      );
      if (!metric) return false;
      const tolerance = Math.abs(metric.value * 0.05);
      return Math.abs(metric.value - kpi.value) <= tolerance;
    });

    return matches;
  }
}
