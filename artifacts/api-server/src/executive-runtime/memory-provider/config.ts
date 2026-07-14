// T.0.2 Phase 2 — Feature flag + configuration
// LOCKED: MEMORY_READ_ENABLED env var

const DEFAULT_MAX_TOKENS = 2000;
const CEO_TOKEN_BUDGET = 2500;
const CKO_TOKEN_BUDGET = 3000;
const CTO_CAIO_TOKEN_BUDGET = 2000;
const DEFAULT_LOW_BUDGET = 1500;

export const memoryConfig = {
  get enabled(): boolean {
    return process.env.MEMORY_READ_ENABLED !== "false";
  },

  get maxTokens(): number {
    return DEFAULT_MAX_TOKENS;
  },

  getStoreTimeout(store: string): number {
    const timeouts: Record<string, number> = {
      working: 200,
      decisions: 300,
      semantic: 400,
      episodic: 500,
      knowledge: 200,
      orgKnowledge: 500,
    };
    return timeouts[store] ?? 300;
  },

  getExecutiveBudget(executive: string): number {
    const budgets: Record<string, number> = {
      CEO: CEO_TOKEN_BUDGET,
      CKO: CKO_TOKEN_BUDGET,
      CTO: CTO_CAIO_TOKEN_BUDGET,
      CAIO: CTO_CAIO_TOKEN_BUDGET,
      COO: DEFAULT_LOW_BUDGET,
      CFO: DEFAULT_LOW_BUDGET,
      CMO: DEFAULT_LOW_BUDGET,
      CHRO: DEFAULT_LOW_BUDGET,
    };
    return budgets[executive] ?? DEFAULT_MAX_TOKENS;
  },

  get cacheEnabled(): boolean {
    return process.env.MEMORY_CACHE_ENABLED !== "false";
  },

  get l1MaxEntries(): number {
    return 100;
  },

  get l1TtlMs(): number {
    return 60_000;
  },

  get circuitBreakerThreshold(): number {
    return 5;
  },

  get circuitBreakerWindowMs(): number {
    return 30_000;
  },

  get circuitBreakerRetryMs(): number {
    return 60_000;
  },
};

export const MEMORY_DOMAINS = [
  "strategy", "operations", "finance", "technology",
  "marketing", "knowledge", "governance", "ai-operations",
  "architecture", "engineering", "hr", "general",
] as const;
