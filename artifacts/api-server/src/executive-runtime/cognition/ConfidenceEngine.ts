import type {
  EvidenceSet,
  ExecutiveIntent,
  ReasoningPlan,
  ConfidenceReport,
  ConfidenceFactor,
} from "./CognitiveContracts";

export function calculateConfidence(
  evidence: EvidenceSet,
  intent: ExecutiveIntent,
  plan: ReasoningPlan,
): ConfidenceReport {
  const factors: ConfidenceFactor[] = [];

  const evidenceScore = calculateEvidenceScore(evidence);
  factors.push({
    name: "evidence_coverage",
    score: evidenceScore,
    weight: 0.3,
    reason: `Covered ${evidence.items.length} of 8 sources (${evidence.coverage}%)`,
  });

  const planScore = calculatePlanScore(plan);
  factors.push({
    name: "reasoning_quality",
    score: planScore,
    weight: 0.25,
    reason: `${plan.steps.length} reasoning steps with ${plan.mentalModels.length} mental models and ${plan.frameworks.length} frameworks`,
  });

  const constraintScore = calculateConstraintScore(intent);
  factors.push({
    name: "constraint_satisfaction",
    score: constraintScore,
    weight: 0.15,
    reason: `${intent.constraints.length} constraints defined`,
  });

  const clarityScore = calculateClarityScore(intent);
  factors.push({
    name: "intent_clarity",
    score: clarityScore,
    weight: 0.15,
    reason: `Primary: ${intent.primary}, ${intent.secondary.length} secondary intents`,
  });

  const contradictionScore = calculateContradictionScore(evidence);
  factors.push({
    name: "contradiction_check",
    score: contradictionScore,
    weight: 0.15,
    reason: evidence.gaps.length > 0
      ? `${evidence.gaps.length} evidence gaps identified`
      : "No contradictions detected",
  });

  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const overall = Math.round((weightedSum / totalWeight) * 100);

  const recommendation = determineRecommendation(overall, evidence.gaps.length, intent);

  return {
    overall,
    factors,
    missingInfo: evidence.gaps,
    contradictions: [],
    recommendation,
  };
}

function calculateEvidenceScore(evidence: EvidenceSet): number {
  if (evidence.items.length === 0) return 0;
  const coverageScore = evidence.coverage / 100;
  const relevanceScore = evidence.items.reduce((sum, item) => sum + item.relevanceScore, 0) / evidence.items.length;
  return (coverageScore * 0.5 + relevanceScore * 0.5);
}

function calculatePlanScore(plan: ReasoningPlan): number {
  const stepScore = Math.min(plan.steps.length / 7, 1);
  const mentalModelScore = Math.min(plan.mentalModels.length / 5, 1);
  const frameworkScore = Math.min(plan.frameworks.length / 4, 1);
  return stepScore * 0.5 + mentalModelScore * 0.25 + frameworkScore * 0.25;
}

function calculateConstraintScore(intent: ExecutiveIntent): number {
  if (intent.constraints.length === 0) return 0.3;
  return Math.min(1, intent.constraints.length / 5);
}

function calculateClarityScore(intent: ExecutiveIntent): number {
  let score = 0.5;
  if (intent.primary.length > 10) score += 0.2;
  if (intent.secondary.length > 0) score += 0.15;
  if (intent.priority > 0) score += 0.15;
  return Math.min(1, score);
}

function calculateContradictionScore(evidence: EvidenceSet): number {
  if (evidence.gaps.length === 0) return 1;
  return Math.max(0, 1 - evidence.gaps.length * 0.15);
}

function determineRecommendation(
  overall: number,
  gapCount: number,
  intent: ExecutiveIntent,
): "proceed" | "caution" | "defer" | "escalate" {
  if (overall >= 80 && gapCount === 0) return "proceed";
  if (overall >= 60) return "caution";
  if (overall >= 40 || gapCount > 3) return "defer";
  return "escalate";
}
