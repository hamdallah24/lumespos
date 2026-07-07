// ECP-019: Execution Strategy — State machine with anti-loop
// Frozen. Inferred from tool call behavior, not LLM text.
// EXPLORE → INVESTIGATE → ANALYZE → IMPLEMENT → VERIFY → CONCLUDE → ESCALATE

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

  /** Override initial strategy (e.g. skip EXPLORE when target files known) */
  startAt(s: ExecutionStrategy): void { this._strategy = s; }

  /** Infer strategy from current-cycle tool calls — adaptive anti-loop */
  infer(
    toolCalls: { name: string; durationMs: number }[],
    state: string,
    evidenceQuality = 0,
  ): {
    strategy: ExecutionStrategy;
    changed: boolean;
    reason: string;
  } {
    const previous = this._strategy;
    this._toolHistory.push(toolCalls.map(t => t.name));
    this._cycleCount++;

    // Adaptive force advance: threshold depends on evidence + complexity
    // High evidence (>0.60) → advance faster (2-3 cycles)
    // Low evidence (<0.20) → allow more exploration (6-8 cycles)
    // Normal → default (4-6 cycles)
    const baseThreshold = this._complexity === "simple" ? 3 : this._complexity === "complex" ? 6 : 4;
    const adaptiveExplore = evidenceQuality > 0.60 ? Math.max(2, baseThreshold - 1)
      : evidenceQuality < 0.20 ? baseThreshold + 3
      : baseThreshold;
    const adaptiveImplement = evidenceQuality > 0.60 ? 6 : 10;
    const adaptiveVerify = evidenceQuality > 0.60 ? 8 : 12;

    if (this._cycleCount >= adaptiveExplore && ["EXPLORE", "INVESTIGATE"].includes(this._strategy)) {
      this._strategy = "ANALYZE";
    }
    if (this._cycleCount >= adaptiveImplement && this._strategy === "IMPLEMENT") {
      this._strategy = "VERIFY";
    }
    if (this._cycleCount >= adaptiveVerify && this._strategy === "VERIFY") {
      this._strategy = "CONCLUDE";
    }
    // Safety: any strategy past 15 cycles → force CONCLUDE
    if (this._cycleCount >= 15) {
      this._strategy = "CONCLUDE";
    }

    if (toolCalls.length === 0) {
      // Text-only response → advance to next phase
      if (state === "REFLECTING" || state === "COMPLETED" || this._strategy === "VERIFY") {
        this._strategy = "CONCLUDE";
      } else if (this._strategy === "ANALYZE") {
        this._strategy = "IMPLEMENT";
      } else if (this._strategy === "IMPLEMENT") {
        this._strategy = "VERIFY";
      } else {
        this._strategy = "ANALYZE";
      }
    } else {
      const names = toolCalls.map(t => t.name);
      const isWrite = names.some(n => ["writeFile", "editFile", "sshExec"].includes(n));
      const isSearch = names.some(n => ["searchContent", "listDirectory", "fetchGitHubDir"].includes(n));
      const isRead = names.some(n => ["readFile", "fetchGitHubFile", "getDependencies"].includes(n));

      if (isWrite) this._strategy = "IMPLEMENT";
      else if (isSearch) this._strategy = "EXPLORE";
      else if (isRead) this._strategy = "INVESTIGATE";
      else this._strategy = "INVESTIGATE";
    }

    // Adaptive anti-loop: detectLoop juga pakai evidence
    if (this.detectLoop(evidenceQuality)) {
      if (this._strategy === "EXPLORE") { this._strategy = "INVESTIGATE"; }
      else if (this._strategy === "INVESTIGATE") { this._strategy = "ANALYZE"; }
      else if (this._strategy === "ANALYZE") { this._strategy = "IMPLEMENT"; }
      else if (this._strategy === "IMPLEMENT") { this._strategy = "VERIFY"; }
      else if (this._strategy === "VERIFY") { this._strategy = "CONCLUDE"; }
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
      IMPLEMENT: "[SYSTEM] Strategy: IMPLEMENT. Write and edit files based on analysis. Execute commands if needed.",
      VERIFY: "[SYSTEM] Strategy: VERIFY. Run typecheck/build. Read back written files. Confirm no truncation or errors.",
      CONCLUDE: "[SYSTEM] Strategy: CONCLUDE. Time to provide your final analysis. No more tools.",
      ESCALATE: "[SYSTEM] Strategy: ESCALATE. Objective cannot be completed with current resources. Report findings so far.",
    };
    return directives[this._strategy];
  }

  private detectLoop(evidenceQuality = 0): boolean {
    // Adaptive threshold: high evidence → fewer cycles needed to detect loop
    // Low evidence → more lenient (may need more exploration)
    const lookback = evidenceQuality > 0.60 ? 2 : evidenceQuality < 0.20 ? 5 : 3;
    const recent = this._toolHistory.slice(-lookback);
    if (recent.length < lookback) return false;
    const allSameTool = recent.every(tools =>
      tools.length === 1 && tools[0] === recent[0][0]
    );
    // Also detect if using only search tools repeatedly without reading
    const allSearch = recent.every(tools =>
      tools.some(t => ["searchContent", "listDirectory", "fetchGitHubDir"].includes(t))
    );
    return allSameTool || allSearch;
  }

  reset(): void {
    this._strategy = "EXPLORE";
    this._toolHistory = [];
    this._cycleCount = 0;
  }
}

export { ExecutionStrategyEngine };
