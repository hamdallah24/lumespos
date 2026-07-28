import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface Opinion {
  executive: string;
  confidence: number;
  recommendation: string;
  reasoning: string;
  votingWeight: number;
}

export interface ConsensusResult {
  topic: string;
  opinions: Opinion[];
  averageConfidence: number;
  weightedConfidence: number;
  agreementRate: number;
  decision: string;
  confidence: number;
  dissenting: string[];
  timestamp: string;
}

const EXECUTIVE_WEIGHTS: Record<string, number> = {
  CEO: 3.0,
  COO: 2.0,
  CFO: 2.0,
  CMO: 1.0,
  CHRO: 1.0,
  CTO: 1.0,
  CAIO: 1.5,
  CKO: 1.0,
};

export class ConsensusEngine {
  buildConsensus(topic: string, opinions: Opinion[]): ConsensusResult {
    const avgConfidence = opinions.length > 0
      ? opinions.reduce((s, o) => s + o.confidence, 0) / opinions.length
      : 0;

    const totalWeight = opinions.reduce((s, o) => s + (EXECUTIVE_WEIGHTS[o.executive] ?? 1.0), 0);
    const weightedSum = opinions.reduce((s, o) => s + (o.confidence * (EXECUTIVE_WEIGHTS[o.executive] ?? 1.0)), 0);
    const weightedConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const positive = opinions.filter(o => o.confidence >= 0.6).length;
    const negative = opinions.filter(o => o.confidence < 0.4).length;
    const agreementRate = opinions.length > 0 ? positive / opinions.length : 0;

    const dissenting = opinions.filter(o => o.confidence < 0.4).map(o => o.executive);

    const decision = weightedConfidence >= 0.7 ? "approved" : weightedConfidence >= 0.4 ? "needs_review" : "rejected";

    const result: ConsensusResult = {
      topic,
      opinions,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      weightedConfidence: Math.round(weightedConfidence * 100) / 100,
      agreementRate: Math.round(agreementRate * 100) / 100,
      decision,
      confidence: weightedConfidence,
      dissenting,
      timestamp: new Date().toISOString(),
    };

    return result;
  }

  async getCEOOverride(result: ConsensusResult, ceoReasoning: string): Promise<ConsensusResult> {
    const ceoOpinion: Opinion = {
      executive: "CEO",
      confidence: 0.95,
      recommendation: ceoReasoning,
      reasoning: "CEO strategic override",
      votingWeight: EXECUTIVE_WEIGHTS.CEO,
    };

    const allOpinions = [...result.opinions, ceoOpinion];
    const totalWeight = allOpinions.reduce((s, o) => s + (EXECUTIVE_WEIGHTS[o.executive] ?? 1.0), 0);
    const weightedSum = allOpinions.reduce((s, o) => s + (o.confidence * (EXECUTIVE_WEIGHTS[o.executive] ?? 1.0)), 0);

    return {
      ...result,
      opinions: allOpinions,
      weightedConfidence: totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : result.weightedConfidence,
      decision: ceoReasoning.toLowerCase().includes("setuju") || ceoReasoning.toLowerCase().includes("approve") ? "approved" : "rejected",
      confidence: 0.95,
      dissenting: result.dissenting.filter(e => e !== "CEO"),
      timestamp: new Date().toISOString(),
    };
  }

  recordConsensus(result: ConsensusResult): void {
    for (const opinion of result.opinions) {
      ExecutiveWorkspaceManager.recordDecision(
        opinion.executive,
        `consensus-${Date.now()}`,
        result.decision,
        opinion.reasoning,
        opinion.confidence,
        { topic: result.topic, consensusDecision: result.decision },
        "system",
      );
    }
  }

  formatConsensus(result: ConsensusResult): string {
    const lines: string[] = [];
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push(`│  Consensus: ${result.topic.padEnd(42)} │`);
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push(`│  Decision: ${result.decision.padEnd(39)} │`);
    lines.push(`│  Confidence: ${(result.confidence * 100).toFixed(0)}% (avg: ${(result.averageConfidence * 100).toFixed(0)}%)                │`);
    lines.push(`│  Agreement: ${(result.agreementRate * 100).toFixed(0)}%                                     │`);
    if (result.dissenting.length > 0) {
      lines.push(`│  Dissenting: ${result.dissenting.join(", ").padEnd(36)} │`);
    }
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push("│  Executive Opinions:                                       │");
    for (const op of result.opinions) {
      const icon = op.confidence >= 0.7 ? "✓" : op.confidence >= 0.4 ? "~" : "✗";
      lines.push(`│  ${icon} ${op.executive.padEnd(6)} ${(op.confidence * 100).toFixed(0).padStart(3)}% ${op.recommendation.slice(0, 40).padEnd(40)} │`);
    }
    lines.push("└─────────────────────────────────────────────────────────────┘");
    return lines.join("\n");
  }
}
