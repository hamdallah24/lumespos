import type {
  ExecutiveQuestion,
  ExecutiveDecision,
  ExecutiveRecommendation,
  CognitiveContext,
  CognitiveTrace,
  ExecutiveRole,
} from "./CognitiveContracts";
import type { DecisionAlternative, ConfidenceReport, EvidenceSet, ReasoningPlan } from "./CognitiveContracts";

import { runPipeline, type PipelineResult } from "./CognitivePipeline";
import { getThinkingProfile } from "./ExecutiveThinkingProfiles";
import { ExecutiveMemoryProvider } from "../../executive-memory/ExecutiveMemoryProvider";

export interface ThinkOptions {
  readonly role: ExecutiveRole;
  readonly query: string;
  readonly context?: Record<string, unknown>;
  readonly sessionId?: string;
}

export interface ThinkResult {
  readonly decision: ExecutiveDecision;
  readonly recommendation: ExecutiveRecommendation;
  readonly trace: CognitiveTrace;
}

function buildHistory(role: ExecutiveRole): ExecutiveDecision[] {
  try {
    const recall = ExecutiveMemoryProvider.recallForExecutive(role as any, 10);
    if (!recall || recall.records.length === 0) return [];
    return recall.records.map((r) => ({
      role,
      question: r.title,
      chosenAlternative: { id: r.selectedOption, label: r.selectedOption, description: r.title, pros: [], cons: [], estimatedImpact: "", risk: "" },
      alternatives: r.alternatives.map((a) => ({ id: a, label: a, description: "", pros: [], cons: [], estimatedImpact: "", risk: "" })),
      reasoning: r.description || r.title,
      risks: [],
      confidence: { overall: r.confidence ?? 50, factors: [], missingInfo: [], contradictions: [], recommendation: "proceed" },
      evidence: { questionId: "", items: [], coverage: 0, gaps: [], timestamp: r.createdAt ?? "" },
      plan: { intent: { role, primary: r.title, secondary: [], problemType: "decision", constraints: [], priority: 1 }, thinkingMode: { modeId: "", role, label: "", description: "", confidence: 0 }, mentalModels: [], frameworks: [], steps: [], estimatedComplexity: 0 },
      timestamp: r.createdAt ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export class CognitiveEngine {
  public async think(options: ThinkOptions): Promise<ThinkResult> {
    const question: ExecutiveQuestion = {
      role: options.role,
      query: options.query,
      context: options.context ?? {},
      timestamp: new Date().toISOString(),
    };

    const profile = getThinkingProfile(options.role);

    const ctx = options.context ?? {};
    const memoryContext = typeof ctx.memoryContext === "string" ? ctx.memoryContext : undefined;
    const knowledgeContext = typeof ctx.knowledgeContext === "string" ? ctx.knowledgeContext : undefined;

    const cognitiveContext: CognitiveContext = {
      sessionId: options.sessionId ?? `session-${Date.now()}`,
      role: options.role,
      history: buildHistory(options.role),
      memoryContext,
      knowledgeContext,
    };

    const result: PipelineResult = await runPipeline(question, cognitiveContext);

    return {
      decision: result.decision,
      recommendation: result.recommendation,
      trace: result.trace,
    };
  }

  public async thinkWithProfile(
    options: ThinkOptions,
    profileOverrides?: Partial<ReturnType<typeof getThinkingProfile>>,
  ): Promise<ThinkResult> {
    return this.think(options);
  }
}
