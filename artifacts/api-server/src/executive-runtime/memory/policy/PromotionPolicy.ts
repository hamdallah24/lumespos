export interface PromotionPolicyConfig {
  workingPromotionMinImportance: number;
  longTermPromotionMinImportance: number;
  minRecurrenceForLongTerm: number;
  minConfidenceForLongTerm: number;
  crossExecutiveUsageBonus: number;
  minDaysInCurrentStateBeforePromotion: number;
}

export const DEFAULT_PROMOTION_POLICY: PromotionPolicyConfig = {
  workingPromotionMinImportance: 20,
  longTermPromotionMinImportance: 50,
  minRecurrenceForLongTerm: 3,
  minConfidenceForLongTerm: 0.7,
  crossExecutiveUsageBonus: 10,
  minDaysInCurrentStateBeforePromotion: 1,
};

export class PromotionPolicy {
  constructor(private config: PromotionPolicyConfig = DEFAULT_PROMOTION_POLICY) {}

  getConfig(): PromotionPolicyConfig {
    return { ...this.config };
  }

  shouldPromoteToWorking(importance: number): boolean {
    return importance >= this.config.workingPromotionMinImportance;
  }

  shouldPromoteToLongTerm(importance: number, recurrence: number, confidence: number): boolean {
    return (
      importance >= this.config.longTermPromotionMinImportance &&
      recurrence >= this.config.minRecurrenceForLongTerm &&
      confidence >= this.config.minConfidenceForLongTerm
    );
  }
}
