import { ExplanationTrace } from "../types";

export class DecisionExplanation {
  private counter = 0;

  explain(
    decisionId: string,
    executive: string,
    action: string,
    reasoning: string,
    triggers: { source: string; data: any; threshold?: any }[],
    dataPoints: { label: string; value: any; source: string }[]
  ): ExplanationTrace {
    this.counter++;

    return {
      decisionId: decisionId || `dec-${this.counter}-${Date.now()}`,
      executive,
      action,
      reasoning,
      triggers,
      dataPoints,
      confidence: this._calculateConfidence(triggers, dataPoints),
      generatedAt: new Date().toISOString(),
    };
  }

  formatExplanation(trace: ExplanationTrace): string {
    const triggerList = trace.triggers
      .map((t) => `${t.source}: ${JSON.stringify(t.data)}`)
      .join("; ");

    const dataList = trace.dataPoints
      .map((d) => `${d.label} (${d.source}): ${JSON.stringify(d.value)}`)
      .join("; ");

    return (
      `Kenapa ${trace.executive} memutuskan ${trace.action}? ` +
      `Karena: ${triggerList}, ${dataList}. ` +
      `Confidence: ${(trace.confidence * 100).toFixed(0)}%`
    );
  }

  private _calculateConfidence(
    triggers: { source: string; data: any; threshold?: any }[],
    dataPoints: { label: string; value: any; source: string }[]
  ): number {
    const base = 0.7;
    const triggerWeight = Math.min(triggers.length * 0.05, 0.15);
    const dataWeight = Math.min(dataPoints.length * 0.03, 0.1);
    return Math.min(base + triggerWeight + dataWeight, 0.99);
  }
}
