export interface ImportanceWeights {
  businessImpact: number;
  executivePriority: number;
  recurrence: number;
  userExplicitness: number;
  novelty: number;
  crossExecutiveRelevance: number;
}

export interface ImportanceThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const DEFAULT_IMPORTANCE_WEIGHTS: ImportanceWeights = {
  businessImpact: 0.3,
  executivePriority: 0.2,
  recurrence: 0.15,
  userExplicitness: 0.15,
  novelty: 0.1,
  crossExecutiveRelevance: 0.1,
};

export const DEFAULT_IMPORTANCE_THRESHOLDS: ImportanceThresholds = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 20,
};

export class ImportancePolicy {
  constructor(
    private weights: ImportanceWeights = DEFAULT_IMPORTANCE_WEIGHTS,
    private thresholds: ImportanceThresholds = DEFAULT_IMPORTANCE_THRESHOLDS,
  ) {}

  getWeights(): ImportanceWeights {
    return { ...this.weights };
  }

  getThresholds(): ImportanceThresholds {
    return { ...this.thresholds };
  }
}
