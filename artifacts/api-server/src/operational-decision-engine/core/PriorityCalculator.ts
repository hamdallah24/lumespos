import type { BusinessFact } from "../../business-intelligence/core/types";
import type { SituationSeverity, PriorityResult } from "./types";

const severityBase: Record<SituationSeverity, number> = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 20,
};

export function calculatePriority(
  severity: SituationSeverity,
  fact: BusinessFact,
  financialImpact?: { estimatedLoss: number; probability: number },
): PriorityResult {
  let score = severityBase[severity];

  if (financialImpact) {
    const expectedLoss = financialImpact.estimatedLoss * financialImpact.probability;
    if (expectedLoss > 10_000_000) score += 20;
    else if (expectedLoss > 1_000_000) score += 10;
    else if (expectedLoss > 100_000) score += 5;
  }

  const ageHours = (Date.now() - fact.timestamp.getTime()) / (1000 * 60 * 60);
  if (ageHours > 24) score -= 10;
  else if (ageHours > 4) score -= 5;

  if (fact.severity === "high") score += 10;

  score = Math.max(1, Math.min(100, score));

  const parts: string[] = [];
  parts.push(`base(${severity}=${severityBase[severity]})`);
  if (financialImpact) parts.push(`impact(+${score - severityBase[severity]})`);
  parts.push(`final=${score}`);

  return { score, rationale: parts.join(" → ") };
}
