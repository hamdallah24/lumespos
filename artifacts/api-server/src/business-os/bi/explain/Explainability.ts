import { DecisionExplanation } from "./DecisionExplanation";
import { InsightTrace } from "./InsightTrace";
import { ExplanationTrace, NarrativeInsight, KPIValue } from "../types";

export class Explainability {
  decision: DecisionExplanation;
  insight: InsightTrace;

  constructor() {
    this.decision = new DecisionExplanation();
    this.insight = new InsightTrace();
  }

  explainDecision(
    decisionId: string,
    executive: string,
    action: string,
    reasoning: string,
    triggers: { source: string; data: any; threshold?: any }[],
    dataPoints: { label: string; value: any; source: string }[]
  ): ExplanationTrace {
    return this.decision.explain(decisionId, executive, action, reasoning, triggers, dataPoints);
  }

  explainInsight(
    insight: NarrativeInsight
  ): { trace: { rootData: string[]; derivation: string; confidence: number }; formatted: string } {
    const trace = this.insight.trace(insight);
    const formatted = this.insight.formatTrace(trace);
    return { trace, formatted };
  }

  generateDecisionSummary(traces: ExplanationTrace[]): string {
    const total = traces.length;
    if (total === 0) return "Tidak ada keputusan untuk diringkas.";

    const avgConfidence =
      traces.reduce((sum, t) => sum + t.confidence, 0) / total;

    const lines = [
      `=== Ringkasan ${total} Keputusan ===`,
      "",
      `Total keputusan: ${total}`,
      `Rata-rata confidence: ${(avgConfidence * 100).toFixed(1)}%`,
      "",
      "Detail Keputusan:",
      ...traces.map(
        (t, i) =>
          `${i + 1}. [${t.decisionId}] ${t.executive} — ${t.action} (confidence: ${(t.confidence * 100).toFixed(0)}%)`
      ),
      "",
      `Dihasilkan: ${new Date().toISOString()}`,
    ];

    return lines.join("\n");
  }

  answerQuestion(
    question: string,
    context: {
      decisions: ExplanationTrace[];
      insights: NarrativeInsight[];
      kpis: KPIValue[];
    }
  ): string {
    const q = question.toLowerCase();

    if (q.includes("keputusan") || q.includes("decision")) {
      if (context.decisions.length === 0) return "Belum ada keputusan yang tercatat.";
      return context.decisions
        .map(
          (d) =>
            `${d.executive} memutuskan "${d.action}" karena ${d.reasoning} (confidence: ${(d.confidence * 100).toFixed(0)}%)`
        )
        .join("\n");
    }

    if (q.includes("insight") || q.includes("wawasan")) {
      if (context.insights.length === 0) return "Belum ada insight yang tersedia.";
      return context.insights
        .map((i) => `${i.type.toUpperCase()}: ${i.headline}`)
        .join("\n");
    }

    if (q.includes("kpi") || q.includes("metrik")) {
      if (context.kpis.length === 0) return "Belum ada data KPI.";
      return context.kpis
        .slice(0, 10)
        .map((k) => `${k.kpiName}: ${k.value}${k.unit}`)
        .join("\n");
    }

    if (q.includes("ringkasan") || q.includes("summary")) {
      return this.generateDecisionSummary(context.decisions);
    }

    return `Maaf, saya tidak dapat menjawab pertanyaan "${question}". Coba tanyakan tentang keputusan, insight, KPI, atau ringkasan.`;
  }
}
