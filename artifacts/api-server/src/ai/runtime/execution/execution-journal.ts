import type { JournalEntry, ExecutionManifest, BudgetAllocation, BudgetUsage, CompletionResult } from "./execution-manifest";
import { recordAudit } from "../../../eios-runtime";

class ExecutionJournal {
  private _manifest: Partial<ExecutionManifest> = {};
  private _cycles: JournalEntry[] = [];
  private _startedAt: number = Date.now();
  private _id: string = `exec_${Date.now().toString(36)}`;

  get id(): string { return this._id; }
  get cycles(): JournalEntry[] { return [...this._cycles]; }

  start(objective: string, complexity: string, budget: BudgetAllocation): void {
    this._manifest.executionId = this._id;
    this._manifest.objective = objective;
    this._manifest.complexity = complexity;
    this._manifest.budget = { allocated: budget, used: { tokens: 0, tools: 0, timeMs: 0 } };
    this._startedAt = Date.now();
  }

  log(entry: JournalEntry): void {
    this._cycles.push(entry);
    recordAudit(`execution-cycle-${entry.cycle}`, "completed", 0);
  }

  finalize(
    completion: CompletionResult,
    stopReason: string,
    budget: BudgetUsage,
    goals: { total: number; assigned: number; completed: number; blocked: number },
    metrics: ExecutionManifest["metrics"],
    delegation: ExecutionManifest["delegation"],
  ): ExecutionManifest {
    this._manifest.completion = completion;
    this._manifest.stopReason = stopReason;
    this._manifest.budget = {
      allocated: this._manifest.budget?.allocated || { maxTokens: 0, maxTools: 0, maxTimeMs: 0, maxIdleCycles: 0 },
      used: budget,
    };
    this._manifest.goals = goals;
    this._manifest.progress = {
      assignment: completion.assignmentProgress,
      execution: completion.executionProgress,
      overall: completion.progress,
    };
    this._manifest.delegation = delegation;
    this._manifest.metrics = metrics;
    this._manifest.cycles = this._cycles;

    return this._manifest as ExecutionManifest;
  }

  reset(): void {
    this._id = `exec_${Date.now().toString(36)}`;
    this._manifest = {};
    this._cycles = [];
  }
}

export { ExecutionJournal };
