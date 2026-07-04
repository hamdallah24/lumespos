// ECP-044 Sprint 2: Experience Engine
// Converts execution outcomes into structured Experience records.

import type { ExecutiveRole, OutcomeStatus, Experience } from "./learning-types";
import { createExperienceId } from "./learning-types";

export interface ExperienceInput {
  missionId: string;
  executive: ExecutiveRole;
  outcome: OutcomeStatus;
  duration: number;
  tokenUsage: number;
  toolUsage: number;
  confidence: number;
  lessons: string[];
}

export class ExperienceEngine {

  /** Generate experience from execution result */
  record(input: ExperienceInput): Experience {
    return {
      id: createExperienceId(),
      missionId: input.missionId,
      executive: input.executive,
      outcome: input.outcome,
      duration: input.duration,
      tokenUsage: input.tokenUsage,
      toolUsage: input.toolUsage,
      confidence: input.confidence,
      lessons: input.lessons,
      createdAt: new Date().toISOString(),
    };
  }

  /** Compute experience score (0-100) */
  score(exp: Experience): number {
    let score = 0;

    // Outcome weight
    if (exp.outcome === "SUCCESS") score += 50;
    else if (exp.outcome === "PARTIAL") score += 25;

    // Confidence contribution
    score += exp.confidence * 0.3;

    // Efficiency bonus
    if (exp.tokenUsage < 5000 && exp.duration < 30000) score += 15;
    if (exp.lessons.length >= 2) score += 10;

    return Math.min(100, Math.round(score));
  }
}

export const experienceEngine = new ExperienceEngine();
