// ECP-019: Execution Budget — allocation + safety boundary
// Frozen. Budget is a SAFETY BOUNDARY, not a decision maker.

import type { BudgetAllocation, BudgetUsage } from "./execution-manifest";
import { executionPolicy } from "./execution-policy";

class ExecutionBudget {
  private _allocation: BudgetAllocation;
  private _usage: BudgetUsage = { tokens: 0, tools: 0, timeMs: 0 };
  private _startedAt: number = Date.now();

  constructor(complexity: string) {
    this._allocation = executionPolicy.resolveBudget(complexity);
  }

  get allocation(): BudgetAllocation { return this._allocation; }
  get usage(): BudgetUsage { return this._usage; }

  recordTokens(count: number): void { this._usage.tokens += count; }
  recordTool(): void { this._usage.tools++; }
  refreshTime(): void { this._usage.timeMs = Date.now() - this._startedAt; }

  isExceeded(): { exceeded: boolean; reason?: string } {
    this.refreshTime();
    if (this._usage.tokens >= this._allocation.maxTokens) return { exceeded: true, reason: "TOKEN_BUDGET_EXCEEDED" };
    if (this._usage.tools >= this._allocation.maxTools) return { exceeded: true, reason: "TOOL_BUDGET_EXCEEDED" };
    if (this._usage.timeMs >= this._allocation.maxTimeMs) return { exceeded: true, reason: "TIME_BUDGET_EXCEEDED" };
    return { exceeded: false };
  }

  remaining(): { tokens: number; tools: number; timeMs: number } {
    this.refreshTime();
    return {
      tokens: Math.max(0, this._allocation.maxTokens - this._usage.tokens),
      tools: Math.max(0, this._allocation.maxTools - this._usage.tools),
      timeMs: Math.max(0, this._allocation.maxTimeMs - this._usage.timeMs),
    };
  }

  reset(): void {
    this._usage = { tokens: 0, tools: 0, timeMs: 0 };
    this._startedAt = Date.now();
  }
}

export { ExecutionBudget };
