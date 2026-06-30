// SPRINT 11: Reflection Engine — did we achieve the objective?
// Produces ExecutionReport + Knowledge Evolution Proposal (if gaps found)

import type { ExecutionSpecificationV1 } from "./execution-spec";

interface ExecutionReport {
  specId: string;
  objectiveAchieved: boolean;
  confidence: number;
  findings: string[];
  gaps: KnowledgeGap[];
  metrics: {
    tokensUsed: number;
    toolsCalled: number;
    stepsCompleted: number;
    totalTimeMs: number;
  };
  recommendation: string;
}

interface KnowledgeGap {
  domain: string;
  description: string;
  severity: "low" | "medium" | "high";
  proposedAction: "create_doc" | "update_doc" | "create_adr" | "none";
  proposedTitle: string;
}

/** Reflect on execution: check if objective was met */
export function reflect(
  spec: ExecutionSpecificationV1,
  responseText: string,
  metrics: { tokensUsed: number; toolsCalled: number; stepsCompleted: number; totalTimeMs: number },
): ExecutionReport {
  const findings: string[] = [];
  const gaps: KnowledgeGap[] = [];
  let objectiveAchieved = true;

  // Check 1: Is response substantive?
  if (responseText.length < 50) {
    findings.push("Response too short — likely incomplete");
    objectiveAchieved = false;
  }

  // Check 2: Does response contain error messages?
  if (/error|gagal|failed|timeout|abort/i.test(responseText.slice(0, 200))) {
    findings.push("Response contains error indicators");
    objectiveAchieved = false;
  }

  // Check 3: Were all tasks completed?
  if (metrics.stepsCompleted < 2 && spec.intent !== "greeting") {
    findings.push(`Only ${metrics.stepsCompleted} steps completed — pipeline may have stopped early`);
  }

  // Check 4: Tokens used vs budget
  if (metrics.tokensUsed > spec.estimatedTokens * 1.5) {
    findings.push(`Token overrun: used ${metrics.tokensUsed} vs budget ${spec.estimatedTokens}`);
  }

  // Knowledge gap detection
  if (spec.entities.length === 0 && spec.intent !== "greeting") {
    gaps.push({
      domain: spec.domain,
      description: `No entities extracted for "${spec.problem}" — ${spec.domain} may lack documentation`,
      severity: "medium",
      proposedAction: "create_doc",
      proposedTitle: `${spec.domain}_REFERENCE.md`,
    });
  }

  if (spec.confidence < 60) {
    gaps.push({
      domain: spec.domain,
      description: `Low confidence (${spec.confidence}%) for intent "${spec.intent}" — Semantic Engine needs tuning or more context`,
      severity: "low",
      proposedAction: "none",
      proposedTitle: "",
    });
  }

  if (findings.length > 0 && !objectiveAchieved) {
    gaps.push({
      domain: "runtime",
      description: findings.join("; "),
      severity: "medium",
      proposedAction: "create_adr",
      proposedTitle: `ADR-020-${spec.domain.toUpperCase()}-EXECUTION-ISSUE`,
    });
  }

  return {
    specId: spec.id,
    objectiveAchieved,
    confidence: objectiveAchieved ? Math.min(spec.confidence + 5, 100) : Math.max(spec.confidence - 10, 30),
    findings,
    gaps,
    metrics,
    recommendation: objectiveAchieved
      ? "Objective achieved. No action required."
      : gaps.length > 0
        ? `Knowledge gaps found in ${gaps.map(g => g.domain).join(", ")}. Proposals generated.`
        : "Execution issue detected. Review pipeline or context.",
  };
}

export const reflectionEngine = {
  name: "ReflectionEngine",
  version: "1.0.0",
  capabilities: ["execution-review", "gap-detection", "knowledge-evolution-proposal"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
