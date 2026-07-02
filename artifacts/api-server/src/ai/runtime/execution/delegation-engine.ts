// ECP-019: Delegation Engine — 4-layer delegation coordinator
// Frozen. Goal → Capability → Role → Runtime → Scheduler.
// Uses existing capability-runtime.ts + organization-engine.ts.

import type { GoalNode, DelegationResult } from "./execution-manifest";
import { capabilityGraph } from "./capability-graph";
import { roleGraph } from "./role-graph";
import { runtimeResolver } from "./runtime-resolver";
import { scheduler } from "./scheduler";

class DelegationEngine {
  /** Resolve 4-layer delegation for a goal node */
  assign(goal: GoalNode): DelegationResult {
    const capability = goal.requiredCapability || "GENERAL";

    const roles = capabilityGraph.getRoles(capability);
    if (roles.length === 0) {
      return this.fallback(goal, "No role for capability: " + capability);
    }

    const primaryRole = roles[0];
    const runtimeType = roleGraph.getRuntimeType(primaryRole);
    if (!runtimeType) {
      return this.fallback(goal, "No runtime type for role: " + primaryRole);
    }

    const candidates = runtimeResolver.findCandidates(runtimeType);
    if (candidates.length === 0) {
      return this.fallback(goal, "No candidates for type: " + runtimeType);
    }

    const selection = scheduler.select(candidates);
    return {
      goalId: goal.id,
      capability,
      role: primaryRole,
      assignedTo: selection.selected.runtime,
      assignedById: selection.selected.id,
      fallback: false,
      reason: selection.reason,
    };
  }

  /** Quick delegation for single-runtime execution (current mode) */
  assignToCurrentRuntime(goal: GoalNode): DelegationResult {
    goal.status = "ASSIGNED";
    goal.owner = "CTO";
    return {
      goalId: goal.id,
      capability: goal.requiredCapability || "GENERAL",
      role: "CTO",
      assignedTo: "CTO",
      assignedById: "RUNTIME-002",
      fallback: false,
      reason: "Single runtime — self-assigned",
    };
  }

  private fallback(goal: GoalNode, reason: string): DelegationResult {
    return {
      goalId: goal.id,
      capability: goal.requiredCapability || "GENERAL",
      role: "Generalist",
      assignedTo: "CEO",
      assignedById: "RUNTIME-001",
      fallback: true,
      reason,
    };
  }
}

export const delegationEngine = new DelegationEngine();
