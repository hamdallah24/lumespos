// ECP-019: Execution Strategy — State machine with anti-loop
// Frozen. Inferred from tool call behavior, not LLM text.
// EXPLORE → INVESTIGATE → ANALYZE → CONCLUDE → ESCALATE

import type { ExecutionStrategy, JournalEntry } from "./execution-manifest";
import { executionPolicy } from "./execution-policy";

class ExecutionStrategyEngine {
  private _strategy: ExecutionStrategy = "EXPLORE";
  private _toolHistory: string[][] = [];
  private _complexity: string = "medium";
  private _cycleCount = 0;

  get strategy(): ExecutionStrategy { return this._strategy; }
  get cycleCount(): number { return this._cycleCount; }

  setComplexity(c: string): void { this._complexity = c; }

  /** Infer strategy from current-cycle tool calls */
  infer(toolCalls: { name: string; durationMs: number }[], state: string): {
    strategy: ExecutionStrategy;
    changed: boolean;
    reason: string;
  } {
    const previous = this._strategy;
    this._toolHistory.push(toolCalls.map(t => t.name));
    this._cycleCount++;

    // Force transition: after 4 cycles go to ANALYZE, after 8 go to CONCLUDE
    if (this._cycleCount >= 8) {
      this._strategy = "CONCLUDE";
    } else if (this._cycleCount >= 4 && ["EXPLORE", "INVESTIGATE"].includes(this._strategy)) {
      this._strategy = "ANALYZE";
    }

    if (toolCalls.length === 0) {
      if (state === "REFLECTING" || state === "COMPLETED") {
        this._strategy = "CONCLUDE";
      } else {
        this._strategy = "ANALYZE";
      }
    } else {
      const names = toolCalls.map(t => t.name);
      const isSearch = names.some(n => ["searchContent", "listDirectory", "fetchGitHubDir"].includes(n));
      const isRead = names.some(n => ["readFile", "fetchGitHubFile", "getDependencies"].includes(n));

      if (isSearch) this._strategy = "EXPLORE";
      else if (isRead) this._strategy = "INVESTIGATE";
      else this._strategy = "INVESTIGATE";
    }

    // Anti-loop detection
    if (this.detectLoop()) {
      if (this._strategy === "EXPLORE") { this._strategy = "INVESTIGATE"; }
      else if (this._strategy === "INVESTIGATE") { this._strategy = "ANALYZE"; }
      else if (this._strategy === "ANALYZE") { this._strategy = "ESCALATE"; }
    }

    const changed = previous !== this._strategy;
    return { strategy: this._strategy, changed, reason: changed ? `${previous} → ${this._strategy}` : "unchanged" };
  }

  /** Get system directive for strategy transition */
  getDirective(): string {
    const directives: Record<ExecutionStrategy, string> = {
      EXPLORE: "[SYSTEM] Strategy: EXPLORE. Search for relevant files and code. Gather evidence.",
      INVESTIGATE: "[SYSTEM] Strategy: INVESTIGATE. Read files found. Inspect and compare. No more searching.",
      ANALYZE: "[SYSTEM] Strategy: ANALYZE. Analyze what you have. Only call tools if critical new info needed.",
      CONCLUDE: "[SYSTEM] Strategy: CONCLUDE. Time to provide your final analysis. No more tools.",
      ESCALATE: "[SYSTEM] Strategy: ESCALATE. Objective cannot be completed with current resources. Report findings so far.",
    };
    return directives[this._strategy];
  }

  private detectLoop(): boolean {
    const recent = this._toolHistory.slice(-4);
    if (recent.length < 4) return false;
    const threshold = executionPolicy.getAntiLoopThreshold(this._complexity);
    const allSameTool = recent.every(tools =>
      tools.length === 1 && tools[0] === recent[0][0]
    );
    return allSameTool;
  }

  reset(): void {
    this._strategy = "EXPLORE";
    this._toolHistory = [];
    this._cycleCount = 0;
  }
}

export { ExecutionStrategyEngine };
