// FOUNDATION FILE — Modification Policy: Only bug fixes. ADR Required. Owner: CTO.
// ECP-019: Execution Governor — orchestrator only, NO logic
// Frozen. Delegates all decisions to 4 engines.
// Engines never call each other. Governor is the only coordinator.

import type { ObjectiveState, ExecutionStrategy, ExecutionManifest, StopReason, JournalEntry, GoalNode, ExecutionSnapshot, ExecutionContract } from "./execution-manifest";
import { ObjectiveTracker } from "./objective-tracker";
import { GoalTree } from "./goal-tree";
import { CompletionPolicy } from "./completion-policy";
import { ExecutionStrategyEngine } from "./execution-strategy";
import { ExecutionBudget } from "./execution-budget";
import { ExecutionMetrics } from "./execution-metrics";
import { ExecutionJournal } from "./execution-journal";
import { delegationEngine } from "./delegation-engine";
import { executionPolicy } from "./execution-policy";
import { EXECUTION_COMPLETION_POLICY_V1 } from "./execution-completion-policy-v1";

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
  private _goalEvidenceCycles = new Map<string, number>();
  private _currentGoalId: string | null = null;
  private _evidenceThreshold: number = 2;

  constructor(complexity: string, domain: string, entities: string[], objective: string, onExecutionEvent?: (snapshot: ExecutionSnapshot) => void) {
    this._onEvent = onExecutionEvent;
    this.budget = new ExecutionBudget(complexity);
    this.strategyEngine.setComplexity(complexity);
    this.goalTree.build(domain, entities, objective);
    this.journal.start(objective, complexity, this.budget.allocation);
    this._evidenceThreshold = executionPolicy.evidenceThresholds[complexity] || 2;
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
    filePaths?: string[],  // ADR-010: file paths for evidence tracking
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

    // ECP-020 Phase 6: Evidence-based goal completion
    if (hasToolCalls) {
      const pendingGoals = this.goalTree.pending();
      if (pendingGoals.length > 0) {
        const goal = pendingGoals[0];
        this._currentGoalId = goal.id;

        if (goal.status === "PENDING") {
          goal.status = "IN_PROGRESS";
        }

        const cycles = (this._goalEvidenceCycles.get(goal.id) || 0) + 1;
        this._goalEvidenceCycles.set(goal.id, cycles);

        if (cycles >= this._evidenceThreshold
            && this.metrics.evidenceQuality >= EXECUTION_COMPLETION_POLICY_V1.minimumEvidence) {
          this.goalTree.markCompleteById(goal.id);
          this._goalEvidenceCycles.set(goal.id, 0);
        }
      }
    }

    // Also mark goal complete when strategy advances past investigation
    if (strategyResult.changed && this.strategyEngine.strategy === "ANALYZE" && this._currentGoalId) {
      const goal = this.goalTree.get(this._currentGoalId);
      if (goal && goal.status !== "COMPLETED" && goal.status !== "SKIPPED") {
        this.goalTree.markCompleteById(this._currentGoalId);
      }
    }

    // Legacy path: markComplete still works if matchedPath is provided
    if (matchedPath) this.goalTree.markComplete(matchedPath);

    // ADR-010: Record all file paths for evidence quality computation
    if (filePaths) {
      for (const p of filePaths) this.metrics.recordExploration(p);
    } else if (matchedPath) {
      this.metrics.recordExploration(matchedPath);
    }

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
        // ECP-037 P2: Use execution-based progress (metrics) instead of goal-based (goalTree)
        // GoalTree has 1 goal = user message — never completes. Metrics reflect actual work done.
        assignment: 100,  // Single-runtime mode: always assigned
        execution: Math.min(100, this.metrics.cyclesExecuted * 10 + Math.round(this.metrics.evidenceQuality * 40)),
        overall: Math.min(95, this.metrics.cyclesExecuted * 8 + Math.round(this.metrics.evidenceQuality * 35)),
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

  // ── ECP-039: Governor Lifecycle API ──

  /** Generate ExecutionContract — Governor is the sole policy owner */
  planExecution(role: string, spec: { intent?: string; domain?: string; complexity?: string; objective?: string; entities?: string[]; targetFiles?: string[] }): ExecutionContract {
    const { getDefaultCapabilities } = require("./execution-capabilities");
    const { resolveTools } = require("./tool-registry");
    const capabilities = getDefaultCapabilities(role);
    const isEmpty = capabilities.length === 0;
    const hasTargets = (spec.targetFiles?.length ?? 0) > 0;

    const contract: ExecutionContract = {
      role: role as "CEO" | "CTO" | "COO",
      mission: spec.intent || "Analyze",
      objective: spec.objective || spec.intent || "Complete task",
      mode: isEmpty ? "REASONING" : "EXECUTION",
      strategy: isEmpty ? undefined : hasTargets ? "INVESTIGATE" : undefined,
      capabilities,
      allowedTools: resolveTools(capabilities, require("./execution-capabilities").CAPABILITY_TOOLS),
      budget: {
        tokens: isEmpty ? 4000 : "adaptive",
        tools: isEmpty ? 0 : "adaptive",
        timeMs: isEmpty ? 30000 : "adaptive",
      },
      exitPolicy: isEmpty ? "IMMEDIATE" : "OBJECTIVE_COMPLETED",
      telemetryPolicy: isEmpty ? "SUMMARY_ONLY" : "FULL_TRACE",
      verificationPolicy: isEmpty ? "LIGHT" : "STRICT",
    };

    // Apply contract strategy to engine
    if (contract.strategy) {
      this.strategyEngine.startAt(contract.strategy);
    }

    return contract;
  }

  /** Begin execution — trace + telemetry setup */
  beginExecution(_contract: ExecutionContract): void {
    this.tracker.transition("UNDERSTANDING");
  }

  /** Observe — collect facts, emit snapshot. NO decisions. */
  observe(
    _hasToolCalls: boolean,
    toolCalls: { name: string; durationMs: number }[],
    tokensUsed: number,
  ): void {
    this.budget.recordTokens(tokensUsed);
    this.metrics.recordCycle(this._cycle, toolCalls);
  }

  /** Evaluate — make decisions based on verification. NO hardcoded numbers. */
  evaluate(contract: ExecutionContract, verification?: { completed?: boolean; confident?: boolean; needsMoreEvidence?: boolean; passed?: boolean }): { action: "STOP" | "CONTINUE" | "CONCLUDE"; reason: string } {
    if (contract.exitPolicy === "IMMEDIATE") return { action: "STOP", reason: "IMMEDIATE" };

    const budgetCheck = this.budget.isExceeded();
    if (budgetCheck.exceeded) return { action: "STOP", reason: "BUDGET_EXHAUSTED" };

    if (contract.verificationPolicy === "STRICT" && verification) {
      if (verification.completed && verification.confident) return { action: "CONCLUDE", reason: "Verification: completed + confident" };
      if (!verification.needsMoreEvidence && verification.completed) return { action: "CONCLUDE", reason: "Verification: evidence sufficient" };
    }

    if (contract.verificationPolicy === "LIGHT") return { action: "STOP", reason: "LIGHT — no verification needed" };

    if (this.strategyEngine.strategy === "CONCLUDE") return { action: "STOP", reason: "CONCLUDE" };

    return { action: "CONTINUE", reason: "Ongoing" };
  }

  /** Finish execution — journal + telemetry finalize */
  finishExecution(_contract: ExecutionContract): void {
    const completion = this.completion.assess(this.tracker.state, this.strategyEngine.strategy, this.goalTree, this.metrics.evidenceQuality);
    this.journal.finalize(
      completion, this._stopReason, this.budget.usage,
      { total: 1, assigned: 1, completed: 1, blocked: 0 },
      this.metrics.snapshot(),
      { totalDelegated: 0, fallbacks: 0, byRole: {} },
    );
  }
}

export { ExecutionGovernor };
