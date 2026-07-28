import type { Recommendation } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `rec-${Date.now()}-${counter}`;
}

export function createRecommendation(
  executive: string,
  title: string,
  description: string,
  confidence: number,
  relatedDecisionId?: string,
): Recommendation {
  return {
    id: nextId(),
    executive,
    title,
    description,
    status: "pending",
    confidence,
    relatedDecisionId,
    createdAt: new Date().toISOString(),
  };
}

export function acceptRecommendation(rec: Recommendation): Recommendation {
  return { ...rec, status: "accepted", resolvedAt: new Date().toISOString() };
}

export function rejectRecommendation(rec: Recommendation): Recommendation {
  return { ...rec, status: "rejected", resolvedAt: new Date().toISOString() };
}

export function implementRecommendation(rec: Recommendation): Recommendation {
  return { ...rec, status: "implemented", resolvedAt: new Date().toISOString() };
}
