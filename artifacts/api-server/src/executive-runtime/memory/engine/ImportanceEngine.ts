import type { MemoryImportanceScore, ImportanceLevel } from "../models/MemoryImportance";
import { classifyImportance } from "../models/MemoryImportance";
import { ImportancePolicy } from "../policy/ImportancePolicy";
import type { MemoryCategory } from "../models/MemoryRecord";

const CATEGORY_IMPACT_BASE: Record<MemoryCategory, number> = {
  decision: 80,
  insight: 60,
  fact: 50,
  preference: 30,
  pattern: 70,
  relationship: 40,
  event: 50,
  learning: 65,
};

export class ImportanceEngine {
  constructor(private policy: ImportancePolicy = new ImportancePolicy()) {}

  score(params: {
    content: string;
    category: MemoryCategory;
    executivePriority: number;
    recurrenceCount: number;
    isUserExplicit: boolean;
    crossExecutiveCount: number;
    existingSimilarCount?: number;
  }): MemoryImportanceScore {
    const weights = this.policy.getWeights();

    const businessImpact = this.scoreBusinessImpact(params.category, params.content);
    const executivePriority = Math.min(params.executivePriority, 100);
    const recurrence = this.scoreRecurrence(params.recurrenceCount);
    const userExplicitness = params.isUserExplicit ? 90 : 20;
    const novelty = this.scoreNovelty(params.existingSimilarCount ?? 0);
    const crossExecutiveRelevance = Math.min(params.crossExecutiveCount * 20, 100);

    const total = Math.round(
      businessImpact * weights.businessImpact +
      executivePriority * weights.executivePriority +
      recurrence * weights.recurrence +
      userExplicitness * weights.userExplicitness +
      novelty * weights.novelty +
      crossExecutiveRelevance * weights.crossExecutiveRelevance
    );

    return {
      total: Math.min(total, 100),
      businessImpact,
      executivePriority,
      recurrence,
      userExplicitness,
      novelty,
      crossExecutiveRelevance,
    };
  }

  classify(score: MemoryImportanceScore): ImportanceLevel {
    return classifyImportance(score.total);
  }

  private scoreBusinessImpact(category: MemoryCategory, _content: string): number {
    const base = CATEGORY_IMPACT_BASE[category] ?? 50;
    return base;
  }

  private scoreRecurrence(count: number): number {
    if (count >= 10) return 100;
    if (count >= 5) return 75;
    if (count >= 3) return 50;
    if (count >= 1) return 25;
    return 0;
  }

  private scoreNovelty(existingCount: number): number {
    if (existingCount === 0) return 100;
    if (existingCount === 1) return 60;
    if (existingCount <= 3) return 30;
    return 10;
  }
}
