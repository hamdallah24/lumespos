// ECP-040: Pipeline Context — Single Source of Truth for execution state
// Mutasi seluruh state execution hanya terjadi di sini.
// Governor membaca/menulis state via context. Runtime membaca contract dari context.

import type {
  ExecutionContract,
  ExecutionStrategy,
  BudgetAllocation,
  BudgetUsage,
  JournalEntry,
  ExecutionSnapshot,
} from "./execution-manifest";

export type PipelineState =
  | "PLANNING"
  | "EXECUTING"
  | "OBSERVING"
  | "EVALUATING"
  | "FINISHED"
  | "FAILED";

export interface ToolResult {
  name: string;
  durationMs: number;
  status: "ok" | "error";
  error?: string;
}

export class PipelineContext {
  readonly contract: ExecutionContract;
  readonly startedAt: number = Date.now();

  cycle: number = 0;
  state: PipelineState = "PLANNING";
  strategy: ExecutionStrategy = "EXPLORE";
  prevStrategy: string = "";
  stopReason: string = "";

  toolHistory: { name: string; durationMs: number }[][] = [];
  currentToolCalls: ToolResult[] = [];

  budget: { allocated: BudgetAllocation; used: BudgetUsage } = {
    allocated: { maxTokens: 0, maxTools: 0, maxTimeMs: 0, maxIdleCycles: 0 },
    used: { tokens: 0, tools: 0, timeMs: 0 },
  };

  journal: JournalEntry[] = [];
  result: string = "";

  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: ExecutionSnapshot) => void;

  constructor(contract: ExecutionContract) {
    this.contract = contract;
  }

  get elapsedMs(): number { return Date.now() - this.startedAt; }

  get toolsCount(): number { return this.budget.used.tools; }
  get tokensCount(): number { return this.budget.used.tokens; }

  recordTokens(count: number): void { this.budget.used.tokens += count; }
  recordTool(): void { this.budget.used.tools++; }
  addJournal(entry: JournalEntry): void { this.journal.push(entry); }
}


