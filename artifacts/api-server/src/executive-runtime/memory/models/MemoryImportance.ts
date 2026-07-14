export interface MemoryImportanceScore {
  total: number;
  businessImpact: number;
  executivePriority: number;
  recurrence: number;
  userExplicitness: number;
  novelty: number;
  crossExecutiveRelevance: number;
}

export type ImportanceLevel = "critical" | "high" | "medium" | "low" | "trivial";

export function classifyImportance(total: number): ImportanceLevel {
  if (total >= 80) return "critical";
  if (total >= 60) return "high";
  if (total >= 40) return "medium";
  if (total >= 20) return "low";
  return "trivial";
}
