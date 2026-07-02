// ECP-019: Execution Governor — orchestrator only, NO logic
// Frozen. Delegates all decisions to 4 engines.
// Engines never call each other. Governor is the only coordinator.

import type { ObjectiveState, ExecutionStrategy, ExecutionManifest, StopReason, JournalEntry, GoalNode, ExecutionSnapshot } from "./execution-manifest";
import { ObjectiveTracker } from "./objective-tracker";
import { GoalTree } from "./goal-tree";
import { CompletionPolicy } from "./completion-policy";
import { ExecutionStrategyEngine } from "./execution-strategy";
import { ExecutionBudget } from "./execution-budget";
import { ExecutionMetrics } from "./execution-metrics";
import { ExecutionJournal } from "./execution-journal";
import { delegationEngine } from "./delegation-engine";

class ExecutionGovernor {
  readonly tracker = new ObjectiveTracker();
  readonly goalTree = new GoalTree();
  readonly completion = new CompletionPolicy();
  readonly strategyEngine = new ExecutionStrategyEngine();
  readonly budget: ExecutionBudget;
  readonly metrics = new ExecutionMetrics();
  readonly journal = new ExecutionJournal();

  private _stopReason: StopReason = "OBJECTIVE_COMPLETED";
  private _cycle: number = 0;
  private _onEvent?: (snapshot: ExecutionSnapshot) => void;

  constructor(complexity: string, domain: string, entities: string[], objective: string, onExecutionEvent?: (snapshot: ExecutionSnapshot) => void) {
    this._onEvent = onExecutionEvent;
    this.budget = new ExecutionBudget(complexity);
    this.strategyEngine.setComplexity(complexity);
    this.goalTree.build(domain, entities, objective);
    this.journal.start(objective, complexity, this.budget.allocation);
  }

  get stopReason(): StopReason { return this._stopReason; }

  shouldContinue(): boolean {
    // Primary: objective complete
    if (this.tracker.isComplete()) {
      this._stopReason = "OBJECTIVE_COMPLETED"; return false;
    }

    // Strategy terminal states
    if (this.strategyEngine.strategy === "CONCLUDE") {
      this._stopReason = "OBJECTIVE_COMPLETED"; return false;
    }
    if (this.strategyEngine.strategy === "ESCALATE") {
      this._stopReason = "OBJECTIVE_BLOCKED"; return false;
    }

    // Safety boundary: budget exceeded
    const budgetCheck = this.budget.isExceeded();
    if (budgetCheck.exceeded) {
      this._stopReason = (budgetCheck.reason as StopReason) || "BUDGET_EXCEEDED";
      return false;
    }

    return true;
  }

  /** Called BEFORE LLM call in each cycle */
  beforeCycle(): number {
    this._cycle++;
    this.tracker.transition(
      this.tracker.state === "INIT" ? "UNDERSTANDING" :
      this.tracker.state === "UNDERSTANDING" ? "PLANNING" : this.tracker.state
    );
    return this._cycle;
  }

  /** Called AFTER LLM call + tool execution */
  afterCycle(
    hasToolCalls: boolean,
    toolCalls: { name: string; durationMs: number }[],
    tokensUsed: number,
    matchedPath?: string,
  ): void {
    this.budget.recordTokens(tokensUsed);
    if (hasToolCalls) this.budget.recordTool();

    // Update objective state based on behavior
    const toolsAreSearch = toolCalls.some(t =>
      ["searchContent", "listDirectory", "fetchGitHubDir"].includes(t.name));
    const toolsAreRead = toolCalls.some(t =>
      ["readFile", "fetchGitHubFile", "getDependencies"].includes(t.name));

    if (hasToolCalls) {
      this.tracker.transition("COLLECTING_EVIDENCE");
    } else if (this.tracker.state === "COLLECTING_EVIDENCE" || this.tracker.state === "ANALYZING") {
      this.tracker.transition("ANALYZING");
    } else {
      this.tracker.transition("REFLECTING");
    }

    // Strategy inference
    const strategyResult = this.strategyEngine.infer(toolCalls, this.tracker.state);
    if (strategyResult.changed && strategyResult.strategy !== this.strategyEngine.strategy) {
      // Governor will inject directive in next cycle
    }

    // Goal tracking
    if (matchedPath) this.goalTree.markComplete(matchedPath);

    // Metrics
    this.metrics.recordCycle(this._cycle, toolCalls);
    if (matchedPath) this.metrics.recordExploration(matchedPath);

    // Journal
    const entry: JournalEntry = {
      cycle: this._cycle,
      timestamp: Date.now(),
      objectiveState: this.tracker.state,
      strategy: this.strategyEngine.strategy,
      strategyReason: strategyResult.reason,
      strategyChanged: strategyResult.changed,
      currentGoal: this.goalTree.pending()[0]?.label,
      goalProgress: `${this.goalTree.countByStatus(["COMPLETED"])}/${this.goalTree.total()}`,
      goalsCompleted: this.goalTree.all().filter(g => g.status === "COMPLETED").map(g => g.label),
      goalsPending: this.goalTree.pending().map(g => g.label),
      toolCalls,
      toolDiversity: this.metrics.toolDiversityScore,
      repeatedActionCount: 0,
      explorationDepth: this.metrics.explorationDepth,
      tokensThisCycle: tokensUsed,
      progress: this.goalTree.progress(),
      decisionStable: this.metrics.stability.stable,
    };
    this.journal.log(entry);

    // Delegation: assign pending goals
    for (const goal of this.goalTree.pending()) {
      if (!goal.owner || goal.owner === "") {
        delegationEngine.assignToCurrentRuntime(goal);
      }
    }

    // Check completion
    const result = this.completion.assess(
      this.tracker.state, this.strategyEngine.strategy,
      this.goalTree, this.metrics.evidenceQuality,
    );

    if (result.status === "COMPLETE") {
      this.tracker.transition("COMPLETED");
    } else if (result.status === "BLOCKED" && !this.tracker.isBlocked()) {
      this.tracker.transition("BLOCKED");
    }

    // ECP-020: Emit execution snapshot for frontend
    this._onEvent?.({
      version: 1 as const,
      executionId: this.journal.id,
      timestamp: Date.now(),
      progress: {
        assignment: this.goalTree.assignmentProgress(),
        execution: this.goalTree.progress(),
        overall: Math.round(this.goalTree.progress() * 0.7 + this.goalTree.assignmentProgress() * 0.3),
      },
      stage: this.tracker.state,
      currentGoal: this.goalTree.pending()[0] ? { label: this.goalTree.pending()[0].label, status: this.goalTree.pending()[0].status } : null,
      owner: this.goalTree.pending()[0]?.owner || "Self",
      strategy: this.strategyEngine.strategy,
      elapsedMs: this.tracker.elapsedMs,
      timelineSummary: {
        completed: this.goalTree.countByStatus(["COMPLETED"]),
        running: this.goalTree.countByStatus(["ASSIGNED", "IN_PROGRESS"]),
        pending: this.goalTree.countByStatus(["PENDING"]),
        total: this.goalTree.total(),
      },
      metrics: this.metrics.snapshot(),
    });
  }

  getStrategyDirective(): string {
    return this.strategyEngine.getDirective();
  }

  getManifest(): ExecutionManifest {
    const completion = this.completion.assess(
      this.tracker.state, this.strategyEngine.strategy,
      this.goalTree, this.metrics.evidenceQuality,
    );

    const goals = {
      total: this.goalTree.total(),
      assigned: this.goalTree.countByStatus(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]),
      completed: this.goalTree.countByStatus(["COMPLETED"]),
      blocked: this.goalTree.countByStatus(["BLOCKED"]),
    };

    return this.journal.finalize(
      completion, this._stopReason, this.budget.usage,
      goals, this.metrics.snapshot(),
      { totalDelegated: 0, fallbacks: 0, byRole: {} },
    );
  }
}

export { ExecutionGovernor };
