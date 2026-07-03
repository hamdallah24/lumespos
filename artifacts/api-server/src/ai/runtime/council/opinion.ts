// ECP-033: Opinion Model — canonical opinion format for all runtimes
// Frozen. Every opinion follows this format regardless of runtime.

import type { CouncilOpinion } from "./types";

let _counter = 0;

export function createOpinion(
  sessionId: string,
  runtime: string,
  recommendation: CouncilOpinion["recommendation"],
  confidence: number,
  rationale: string,
  evidenceIds: string[] = [],
  risks: string[] = [],
  alternatives: string[] = [],
): CouncilOpinion {
  _counter++;
  return {
    id: `opinion-${_counter}`,
    sessionId,
    runtime,
    recommendation,
    confidence,
    rationale,
    evidenceIds,
    risks,
    alternatives,
    submittedAt: new Date().toISOString(),
  };
}

export function isValid(opinion: CouncilOpinion): boolean {
  return opinion.confidence >= 0 && opinion.confidence <= 100
    && opinion.rationale.length > 0
    && opinion.recommendation.length > 0;
}
