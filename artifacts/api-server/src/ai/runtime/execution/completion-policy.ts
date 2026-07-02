// ECP-019: Completion Policy — evidence-based, not boolean
// Frozen. Multi-indicator: Goal Tree + Strategy + Metrics.
// Assignment (30%) + Execution (70%) = Overall Progress.

import type { CompletionResult, GoalNode, ObjectiveState, ExecutionStrategy } from "./execution-manifest";
import type { GoalTree } from "./goal-tree";
import { completionWeights } from "./execution-policy";

class CompletionPolicy {
  assess(
    state: ObjectiveState,
    strategy: ExecutionStrategy,
    goalTree: GoalTree,
    evidenceQuality: number,
  ): CompletionResult {
    const total = goalTree.total();
    const completed = goalTree.countByStatus(["COMPLETED"]);
    const assigned = goalTree.countByStatus(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]);
    const blocked = goalTree.countByStatus(["BLOCKED"]);

    const execPct = total > 0 ? (completed / total) * 100 : 0;
    const assignPct = total > 0 ? (assigned / total) * 100 : 0;
    const overall = execPct * completionWeights.executionProgress + assignPct * completionWeights.assignmentProgress;

    // Strategy conflict: verifying but still exploring
    if ((state === "VERIFYING" || state === "REFLECTING") && strategy === "EXPLORE") {
      return this.result("CONTINUE", overall, execPct, assignPct,
        "Strategy mismatch — must move to ANALYZE", "CONTINUE");
    }

    // Escalation
    if (strategy === "ESCALATE") {
      return this.result("BLOCKED", overall, execPct, assignPct,
        "Escalated — cannot proceed with current resources", "ASK_FOUNDER");
    }

    // Complete
    if (goalTree.isComplete()) {
      return this.result("COMPLETE", 100, 100, 100,
        "All goals completed", "REPORT");
    }

    // Evidence insufficient
    if (state === "REFLECTING" && evidenceQuality < 0.6) {
      return this.result("CONTINUE", overall, execPct, assignPct,
        "Evidence quality below threshold — continue investigation", "CONTINUE");
    }

    // State blocked
    if (state === "BLOCKED") {
      return this.result("BLOCKED", overall, execPct, assignPct,
        `Blocked: ${blocked} goals blocked`, "ASK_FOUNDER");
    }

    const pending = goalTree.pending();
    return this.result("IN_PROGRESS", overall, execPct, assignPct,
      `${pending.length} goals pending`, "CONTINUE");
  }

  private result(
    status: CompletionResult["status"], progress: number,
    execPct: number, assignPct: number, reason: string, nextAction: CompletionResult["nextAction"],
  ): CompletionResult {
    return {
      status, progress: Math.round(progress),
      executionProgress: Math.round(execPct), assignmentProgress: Math.round(assignPct),
      reason, nextAction,
    };
  }
}

export { CompletionPolicy };
