// ECP-032: Resource Policy — configurable governance for token budgets
// Frozen. Foundation defines policy. PromptBudgetEngine enforces it.
// No hardcoded token limits remain in the system.

export const RESOURCE_POLICY = {
  // Default prompt budget (total tokens for system + context)
  defaultBudget: 6000,

  // Per-layer budget allocation (percentages of total budget)
  allocation: {
    foundation: 0.13,   // 800 tokens
    governance: 0.05,   // 300 tokens
    mission: 0.20,      // 1200 tokens
    knowledge: 0.25,    // 1500 tokens
    conversation: 0.17, // 1000 tokens
    response: 0.20,     // 1200 tokens (reserved for LLM response)
  },

  // Layer priority (higher = more important, never dropped)
  priority: {
    foundation: 100,
    governance: 95,
    directive: 90,
    mission: 85,
    knowledge: 70,
    conversation: 40,
    history: 30,
    cache: 20,
  },

  // Compression
  compression: {
    threshold: 0.80,     // Start compressing at 80% budget usage
    aggressiveThreshold: 0.95,
    summaryRatio: 0.30,  // Compress to 30% of original size
    maxHistoryItems: 5,
    maxKnowledgeCards: 10,
  },

  // Cache
  cache: {
    ttlMs: 300000,       // 5 minutes
    foundationTTLMs: 3600000, // 1 hour
  },

  // Recovery
  recovery: {
    maxRetries: 1,
    retryBudgetReduction: 0.30, // Reduce budget by 30% on retry
  },
} as const;

export interface TokenAllocation {
  layer: string;
  budget: number;
  used: number;
  remaining: number;
  priority: number;
}

export function getAllocation(totalBudget: number): TokenAllocation[] {
  const allocations: TokenAllocation[] = [];
  for (const [layer, pct] of Object.entries(RESOURCE_POLICY.allocation)) {
    allocations.push({
      layer,
      budget: Math.round(totalBudget * pct),
      used: 0,
      remaining: Math.round(totalBudget * pct),
      priority: (RESOURCE_POLICY.priority as Record<string, number>)[layer] || 50,
    });
  }
  return allocations.sort((a, b) => b.priority - a.priority);
}
