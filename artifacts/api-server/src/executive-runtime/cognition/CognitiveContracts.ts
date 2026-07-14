import type { RuntimeFacade } from "../../eios-runtime/contracts/RuntimeContracts";

export type ExecutiveRole = "CEO" | "CTO" | "CFO" | "CMO" | "CAIO" | "CKO" | "COO";

export interface ExecutiveQuestion {
  readonly role: ExecutiveRole;
  readonly query: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export interface ExecutiveIntent {
  readonly role: ExecutiveRole;
  readonly primary: string;
  readonly secondary: readonly string[];
  readonly problemType: ProblemType;
  readonly constraints: readonly string[];
  readonly priority: number;
}

export type ProblemType =
  | "decision"
  | "analysis"
  | "diagnosis"
  | "planning"
  | "evaluation"
  | "design"
  | "optimization"
  | "troubleshooting"
  | "forecast"
  | "strategy";

export type ThinkingModeId = string;

export interface ThinkingModeSelection {
  readonly modeId: ThinkingModeId;
  readonly role: ExecutiveRole;
  readonly label: string;
  readonly description: string;
  readonly confidence: number;
}

export interface MentalModelRef {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly reason: string;
}

export interface FrameworkRef {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly reason: string;
  readonly weight: number;
}

export interface ReasoningStep {
  readonly order: number;
  readonly action: string;
  readonly description: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly dependsOn: readonly number[];
}

export interface ReasoningPlan {
  readonly intent: ExecutiveIntent;
  readonly thinkingMode: ThinkingModeSelection;
  readonly mentalModels: readonly MentalModelRef[];
  readonly frameworks: readonly FrameworkRef[];
  readonly steps: readonly ReasoningStep[];
  readonly estimatedComplexity: number;
}

export type EvidenceSource =
  | "knowledge"
  | "conversation"
  | "repository"
  | "memory"
  | "metrics"
  | "runtime"
  | "documents"
  | "external";

export interface EvidenceItem {
  readonly id: string;
  readonly source: EvidenceSource;
  readonly content: string;
  readonly relevanceScore: number;
  readonly timestamp: string;
  readonly sourceRef?: string;
}

export interface EvidenceSet {
  readonly questionId: string;
  readonly items: readonly EvidenceItem[];
  readonly coverage: number;
  readonly gaps: readonly string[];
  readonly timestamp: string;
}

export interface ConfidenceFactor {
  readonly name: string;
  readonly score: number;
  readonly weight: number;
  readonly reason: string;
}

export interface ConfidenceReport {
  readonly overall: number;
  readonly factors: readonly ConfidenceFactor[];
  readonly missingInfo: readonly string[];
  readonly contradictions: readonly string[];
  readonly recommendation: "proceed" | "caution" | "defer" | "escalate";
}

export interface DecisionAlternative {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly estimatedImpact: string;
  readonly risk: string;
}

export interface ExecutiveDecision {
  readonly role: ExecutiveRole;
  readonly question: string;
  readonly chosenAlternative: DecisionAlternative;
  readonly alternatives: readonly DecisionAlternative[];
  readonly reasoning: string;
  readonly risks: readonly string[];
  readonly confidence: ConfidenceReport;
  readonly evidence: EvidenceSet;
  readonly plan: ReasoningPlan;
  readonly timestamp: string;
}

export interface ExecutiveRecommendation {
  readonly decision: ExecutiveDecision;
  readonly actionItems: readonly string[];
  readonly nextSteps: readonly string[];
  readonly escalation?: string;
  readonly summary: string;
}

export interface CognitiveContext {
  readonly sessionId: string;
  readonly role: ExecutiveRole;
  readonly history: readonly ExecutiveDecision[];
  readonly runtime?: RuntimeFacade;
  readonly memoryContext?: string;
  readonly knowledgeContext?: string;
}

export type CognitiveStatus =
  | "idle"
  | "analyzing"
  | "gathering_evidence"
  | "reasoning"
  | "deciding"
  | "complete"
  | "error";

export interface CognitiveTrace {
  readonly correlationId: string;
  readonly steps: readonly CognitiveTraceStep[];
  readonly durationMs: number;
  readonly status: CognitiveStatus;
}

export interface CognitiveTraceStep {
  readonly phase: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly status: "success" | "failure";
  readonly outputSummary: string;
}
