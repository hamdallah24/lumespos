import type {
  ExecutiveQuestion,
  ExecutiveIntent,
  ThinkingModeSelection,
  MentalModelRef,
  FrameworkRef,
  ReasoningPlan,
  EvidenceSet,
  ConfidenceReport,
  ExecutiveDecision,
  ExecutiveRecommendation,
  CognitiveContext,
  CognitiveTrace,
  CognitiveTraceStep,
  CognitiveStatus,
  ProblemType,
  ExecutiveRole,
} from "./CognitiveContracts";

import { selectThinkingModes } from "./ThinkingMode";
import { selectMentalModels } from "./MentalModelSelector";
import { selectFrameworks } from "./FrameworkSelector";
import { buildReasoningPlan } from "./ReasoningStrategy";
import { buildEvidenceSet } from "./EvidenceBuilder";
import { calculateConfidence } from "./ConfidenceEngine";
import { generateDecision } from "./DecisionPattern";

export interface PipelineResult {
  readonly decision: ExecutiveDecision;
  readonly recommendation: ExecutiveRecommendation;
  readonly trace: CognitiveTrace;
}

function determineProblemType(question: ExecutiveQuestion): ProblemType {
  const q = question.query.toLowerCase();
  if (q.includes("strategy") || q.includes("vision") || q.includes("direction")) return "strategy";
  if (q.includes("decide") || q.includes("which") || q.includes("choose") || q.includes("select")) return "decision";
  if (q.includes("analyze") || q.includes("assess") || q.includes("evaluate")) return "analysis";
  if (q.includes("diagnose") || q.includes("root cause") || q.includes("why")) return "diagnosis";
  if (q.includes("plan") || q.includes("roadmap") || q.includes("schedule")) return "planning";
  if (q.includes("design") || q.includes("architect") || q.includes("structure")) return "design";
  if (q.includes("optimize") || q.includes("improve") || q.includes("efficiency")) return "optimization";
  if (q.includes("debug") || q.includes("fix") || q.includes("issue")) return "troubleshooting";
  if (q.includes("forecast") || q.includes("predict") || q.includes("trend")) return "forecast";
  return "decision";
}

function buildIntent(question: ExecutiveQuestion, problemType: ProblemType): ExecutiveIntent {
  return {
    role: question.role,
    primary: question.query.split(" ").slice(0, 5).join(" "),
    secondary: [],
    problemType,
    constraints: Object.keys(question.context).map((k) => `${k}: ${JSON.stringify(question.context[k])}`),
    priority: 5,
  };
}

export async function runPipeline(
  question: ExecutiveQuestion,
  context?: CognitiveContext,
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const steps: CognitiveTraceStep[] = [];
  let status: CognitiveStatus = "analyzing";

  try {
    const problemType = determineProblemType(question);
    const intent = buildIntent(question, problemType);

    const thinkingModes = recordStep("thinking_mode_selection", () => {
      return selectThinkingModes(question.role, question.query, problemType);
    }, steps);

    const selectedMode: ThinkingModeSelection = thinkingModes[0] ?? {
      modeId: `${question.role.toLowerCase()}-default`,
      role: question.role,
      label: "Default",
      description: "Default thinking mode",
      confidence: 50,
    };

    const mentalModels = recordStep("mental_model_selection", () => {
      return selectMentalModels(question.role, problemType, question.query);
    }, steps);

    const frameworks = recordStep("framework_selection", () => {
      return selectFrameworks(question.role, problemType, question.query, mentalModels.length);
    }, steps);

    const plan = recordStep("reasoning_plan", () => {
      return buildReasoningPlan(intent, selectedMode, mentalModels, frameworks);
    }, steps);

    status = "gathering_evidence";
    const evidence = recordStep("evidence_building", () => {
      return buildEvidenceSet(question.query, intent, context);
    }, steps);

    status = "reasoning";
    const confidence = recordStep("confidence_calculation", () => {
      return calculateConfidence(evidence, intent, plan);
    }, steps);

    status = "deciding";
    const decision = recordStep("decision_generation", () => {
      return generateDecision(question.role, question.query, intent, evidence, confidence, plan);
    }, steps);

    const recommendation = recordStep("recommendation_building", () => {
      status = "complete";
      return {
        decision,
        actionItems: [],
        nextSteps: [`Review ${decision.confidence.recommendation} confidence recommendation`],
        summary: `${question.role} decision using ${selectedMode.label} mode — confidence: ${confidence.overall}/100`,
      } as ExecutiveRecommendation;
    }, steps);

    const now = Date.now();
    const trace: CognitiveTrace = {
      correlationId: `trace-${Date.now()}`,
      steps,
      durationMs: now - startedAt,
      status,
    };

    return { decision, recommendation, trace };
  } catch (error) {
    status = "error";
    const now = Date.now();
    return {
      decision: null as unknown as ExecutiveDecision,
      recommendation: null as unknown as ExecutiveRecommendation,
      trace: {
        correlationId: `trace-${Date.now()}`,
        steps,
        durationMs: now - startedAt,
        status,
      },
    };
  }
}

function recordStep<T>(
  phase: string,
  fn: () => T,
  steps: CognitiveTraceStep[],
): T {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  try {
    const result = fn();
    steps.push({
      phase,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      status: "success",
      outputSummary: `${phase} completed`,
    });
    return result;
  } catch (error) {
    steps.push({
      phase,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      status: "failure",
      outputSummary: `${phase} failed: ${error}`,
    });
    throw error;
  }
}
