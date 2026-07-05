// ADR-010 Phase 3: Hierarchical Budget Manager
// Mission → Cycle → LLM Call → Tool — nested budgets.
// Dynamic: unused budget from one cycle flows to the next.

import { getModelDensity, charsToTokens } from "./budget-config";

export interface BudgetAllocation {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
}

export interface CycleBudget {
  maxTokens: number;        // budget for THIS cycle (from shared pool)
  usedTokens: number;
  llmCallTokens: number;    // tokens used by LLM API call
  toolOutputTokens: number; // tokens used by tool results in prompt
}

export class BudgetManager {
  private missionTotal: number;
  private missionUsed: number = 0;
  private cycles: CycleBudget[] = [];
  private modelName: string;

  constructor(missionBudgetTokens: number, modelName?: string) {
    this.missionTotal = this.adjustForModel(missionBudgetTokens, modelName);
    this.modelName = modelName || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }

  /** Allocate budget for a new cycle from remaining mission budget */
  allocateCycle(maxTokens: number): CycleBudget {
    const remaining = this.missionTotal - this.missionUsed;
    const budget = Math.min(maxTokens, remaining);

    const cycle: CycleBudget = {
      maxTokens: budget,
      usedTokens: 0,
      llmCallTokens: 0,
      toolOutputTokens: 0,
    };
    this.cycles.push(cycle);
    return cycle;
  }

  /** Record token usage for the current cycle */
  recordUsage(cycle: CycleBudget, llmTokens: number, toolChars: number): void {
    cycle.llmCallTokens = llmTokens;
    cycle.toolOutputTokens = charsToTokens(toolChars, this.modelName);
    cycle.usedTokens = llmTokens + cycle.toolOutputTokens;
    this.missionUsed += cycle.usedTokens;
  }

  /** Get remaining mission budget */
  remaining(): number {
    return Math.max(0, this.missionTotal - this.missionUsed);
  }

  /** Get total used across all cycles */
  totalUsed(): number {
    return this.missionUsed;
  }

  /** Get mission total */
  missionBudget(): number {
    return this.missionTotal;
  }

  /** Get per-cycle breakdown */
  getCycles(): CycleBudget[] {
    return [...this.cycles];
  }

  /** Check if budget is exhausted */
  isExhausted(): boolean {
    return this.missionUsed >= this.missionTotal;
  }

  /** Request additional budget (dynamic allocation) */
  requestExtension(amount: number, reason: string): { approved: boolean; added: number } {
    // Auto-approve up to 20% of original budget
    const maxExtension = Math.ceil(this.missionTotal * 0.2);
    const approved = Math.min(amount, maxExtension);
    if (approved > 0) {
      this.missionTotal += approved;
    }
    return { approved: approved > 0, added: approved };
  }

  /** Budget summary for logging */
  summary(): string {
    const model = getModelDensity(this.modelName);
    return [
      `Mission: ${this.missionTotal} tokens (${this.cycles.length} cycles, ${this.missionUsed} used, ${this.remaining()} left)`,
      `Model: ${this.modelName} (density: ${model.density})`,
      ...this.cycles.map((c, i) =>
        `  Cycle ${i + 1}: ${c.usedTokens}/${c.maxTokens} tok (LLM: ${c.llmCallTokens}, Tools: ${c.toolOutputTokens})`
      ),
    ].join("\n");
  }

  /** Adjust budget based on model token density */
  private adjustForModel(budgetTokens: number, modelName?: string): number {
    const model = getModelDensity(modelName);
    // Models with higher density need proportionally more budget
    const adjusted = Math.ceil(budgetTokens * model.density);
    return adjusted;
  }
}
