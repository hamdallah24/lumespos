// ECP-032: Prompt Budget Engine — enforces token budgets
// Frozen. No context enters LLM without budget authorization.
// Prevents finish_reason=length by managing allocation.

import { RESOURCE_POLICY, getAllocation, type TokenAllocation } from "./resource-policy";

interface BudgetResult {
  allocations: TokenAllocation[];
  totalBudget: number;
  totalUsed: number;
  overBudget: boolean;
  compressed: boolean;
  droppedLayers: string[];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

class PromptBudgetEngine {
  /** Allocate budget and filter content to fit within budget */
  allocate(contexts: { layer: string; content: string; priority?: number }[], customBudget?: number): BudgetResult {
    const budget = customBudget || RESOURCE_POLICY.defaultBudget;
    const allocations = getAllocation(budget);
    const droppedLayers: string[] = [];
    let totalUsed = 0;
    let compressed = false;
    let overBudget = false;

    for (const alloc of allocations) {
      const ctx = contexts.find(c => c.layer === alloc.layer);
      if (!ctx) continue;

      const tokens = estimateTokens(ctx.content);

      if (tokens <= alloc.budget) {
        alloc.used = tokens;
        alloc.remaining = alloc.budget - tokens;
        totalUsed += tokens;
      } else if (alloc.priority >= 90) {
        // High priority — include but mark as over-budget
        alloc.used = alloc.budget;
        alloc.remaining = 0;
        totalUsed += alloc.budget;
        overBudget = true;
      } else if (alloc.priority >= 50) {
        // Medium priority — compress and include
        alloc.used = Math.round(alloc.budget * RESOURCE_POLICY.compression.summaryRatio);
        alloc.remaining = alloc.budget - alloc.used;
        totalUsed += alloc.used;
        compressed = true;
      } else {
        // Low priority — drop entirely
        alloc.used = 0;
        alloc.remaining = alloc.budget;
        droppedLayers.push(alloc.layer);
      }
    }

    return {
      allocations,
      totalBudget: budget,
      totalUsed,
      overBudget: overBudget || (totalUsed > budget * RESOURCE_POLICY.compression.threshold),
      compressed,
      droppedLayers,
    };
  }

  /** Check if prompt is within budget */
  isWithinBudget(totalTokens: number, budget?: number): boolean {
    const limit = budget || RESOURCE_POLICY.defaultBudget;
    return totalTokens < limit * RESOURCE_POLICY.compression.threshold;
  }

  /** Get recovery budget after first attempt fails */
  getRecoveryBudget(originalBudget: number): number {
    return Math.round(originalBudget * (1 - RESOURCE_POLICY.recovery.retryBudgetReduction));
  }
}

export const promptBudgetEngine = new PromptBudgetEngine();
