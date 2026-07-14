import type { KnowledgeBlock, OutcomeStatus } from "../core/types";

export const ConfidenceAdjuster = {
  adjust(block: KnowledgeBlock, outcome: OutcomeStatus): number {
    switch (outcome) {
      case "success":
        return Math.min(100, block.confidence + 10);
      case "failure":
        return Math.max(0, block.confidence - 20);
      case "partial":
        return Math.max(0, Math.min(100, block.confidence + 5));
      default:
        return block.confidence;
    }
  },
};
