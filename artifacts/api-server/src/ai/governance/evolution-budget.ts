// SPRINT 6: Evolution Budget — rate limit agent proposals
// Prevents Founder from being overwhelmed by auto-generated proposals

interface Budget {
  architecture: number;  // max per week
  knowledge: number;
  governance: number;
  security: number;
  code: number;
}

interface AgentBudget {
  agent: string;
  used: Budget;
  resetAt: number; // timestamp
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_BUDGET: Budget = {
  architecture: 3,
  knowledge: 10,
  governance: 2,
  security: 2,
  code: 5,
};

const _budgets = new Map<string, AgentBudget>();

function getOrCreate(agent: string): AgentBudget {
  const existing = _budgets.get(agent);
  if (existing && Date.now() < existing.resetAt) return existing;
  const fresh: AgentBudget = { agent, used: { architecture: 0, knowledge: 0, governance: 0, security: 0, code: 0 }, resetAt: Date.now() + WEEK_MS };
  _budgets.set(agent, fresh);
  return fresh;
}

/** Check if an agent can submit a proposal of this type */
export function canSubmit(agent: string, type: keyof Budget): { allowed: boolean; remaining: number; resetAt: number } {
  const budget = getOrCreate(agent);
  const used = budget.used[type];
  const max = DEFAULT_BUDGET[type];
  const remaining = max - used;
  return { allowed: remaining > 0, remaining, resetAt: budget.resetAt };
}

/** Record a proposal submission */
export function record(agent: string, type: keyof Budget): void {
  const budget = getOrCreate(agent);
  budget.used[type]++;
}

/** Get budget report for all agents */
export function report(): { agent: string; budget: Budget; remaining: Budget }[] {
  return [..._budgets.entries()].map(([agent, b]) => ({
    agent,
    budget: b.used,
    remaining: {
      architecture: DEFAULT_BUDGET.architecture - b.used.architecture,
      knowledge: DEFAULT_BUDGET.knowledge - b.used.knowledge,
      governance: DEFAULT_BUDGET.governance - b.used.governance,
      security: DEFAULT_BUDGET.security - b.used.security,
      code: DEFAULT_BUDGET.code - b.used.code,
    },
  }));
}

export const evolutionBudget = {
  name: "EvolutionBudget",
  version: "1.0.0",
  capabilities: ["rate-limiting", "proposal-budget", "founder-protection"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
