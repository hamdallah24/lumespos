import type {
  ExecutiveIntent,
  EvidenceSet,
  ConfidenceReport,
  ReasoningPlan,
  ExecutiveDecision,
  DecisionAlternative,
  ExecutiveRole,
} from "./CognitiveContracts";

function generateId(): string {
  return `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const ROLE_DECISION_STYLES: Record<ExecutiveRole, string[]> = {
  CEO: ["vision", "strategic", "bold", "calculated"],
  CTO: ["analytical", "systematic", "evidence", "tradeoff"],
  CFO: ["conservative", "data-driven", "risk-aware", "precise"],
  CMO: ["creative", "market-focused", "growth", "customer"],
  CAIO: ["model-driven", "experimental", "iterative", "efficiency"],
  CKO: ["systematic", "comprehensive", "quality", "structured"],
  COO: ["pragmatic", "process-oriented", "execution", "efficient"],
};

export function generateDecision(
  role: ExecutiveRole,
  question: string,
  intent: ExecutiveIntent,
  evidence: EvidenceSet,
  confidence: ConfidenceReport,
  plan: ReasoningPlan,
): ExecutiveDecision {
  const alternatives = generateAlternatives(role, intent);
  const chosen = selectBestAlternative(alternatives, evidence, confidence);

  return {
    role,
    question,
    chosenAlternative: chosen,
    alternatives,
    reasoning: buildReasoningSummary(role, plan, evidence, confidence),
    risks: identifyRisks(chosen, evidence),
    confidence,
    evidence,
    plan,
    timestamp: new Date().toISOString(),
  };
}

function generateAlternatives(role: ExecutiveRole, intent: ExecutiveIntent): DecisionAlternative[] {
  const style = ROLE_DECISION_STYLES[role] ?? ["balanced"];
  const alternatives: DecisionAlternative[] = [];

  for (let i = 0; i < Math.min(3, style.length); i++) {
    alternatives.push({
      id: generateId(),
      label: `${style[i]}-approach-${i + 1}`,
      description: `A ${style[i]} approach to address: ${intent.primary}`,
      pros: [`Aligns with ${style[i]} strategy`, `Directly addresses ${intent.primary}`],
      cons: ["Requires validation", "Assumes current context"],
      estimatedImpact: `Moderate impact on ${intent.primary}`,
      risk: style[i] === "conservative" ? "Low" : style[i] === "bold" ? "High" : "Medium",
    });
  }

  return alternatives;
}

function selectBestAlternative(
  alternatives: DecisionAlternative[],
  evidence: EvidenceSet,
  confidence: ConfidenceReport,
): DecisionAlternative {
  const alternative = alternatives[0];
  return {
    ...alternative,
    pros: [
      ...alternative.pros,
      `Evidence coverage: ${evidence.coverage}%`,
      `Confidence: ${confidence.overall}/100`,
    ],
  };
}

function buildReasoningSummary(
  role: ExecutiveRole,
  plan: ReasoningPlan,
  evidence: EvidenceSet,
  confidence: ConfidenceReport,
): string {
  return [
    `Role: ${role}`,
    `Thinking Mode: ${plan.thinkingMode.label}`,
    `Strategy: ${plan.intent.problemType}`,
    `Evidence Sources: ${evidence.items.length}`,
    `Confidence: ${confidence.overall}/100 (${confidence.recommendation})`,
  ].join("; ");
}

function identifyRisks(
  alternative: DecisionAlternative,
  evidence: EvidenceSet,
): string[] {
  const risks: string[] = [
    `Risk level: ${alternative.risk}`,
  ];
  if (evidence.gaps.length > 0) {
    risks.push(`${evidence.gaps.length} evidence gaps unaddressed`);
  }
  return risks;
}
