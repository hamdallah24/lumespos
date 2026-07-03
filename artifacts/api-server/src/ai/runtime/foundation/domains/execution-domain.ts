// ECP-023: Execution Domain — budget, anti-loop, scheduler, completion
// Frozen. Reads from execution-policy.ts (to be migrated to Foundation in ECP-024).

import type { IExecutionDomain } from "../types/provider-interfaces";
import type { ExecutionBudget, ExecutionPolicy } from "../types/foundation-types";
import { executionPolicy } from "../../execution/execution-policy";

class ExecutionDomain implements IExecutionDomain {
  getBudget(complexity: string): ExecutionBudget {
    return executionPolicy.resolveBudget(complexity);
  }

  getAntiLoopThreshold(complexity: string): number {
    return executionPolicy.getAntiLoopThreshold(complexity);
  }

  getEvidenceThreshold(complexity: string): number {
    return executionPolicy.evidenceThresholds[complexity] || 2;
  }

  getCompletionWeights(): { executionProgress: number; assignmentProgress: number } {
    return executionPolicy.completionWeights;
  }

  getPolicy(): ExecutionPolicy {
    return {
      budgetMatrix: executionPolicy.budgetMatrix,
      globalSafety: executionPolicy.globalSafety,
      antiLoop: executionPolicy.antiLoop,
      evidenceThresholds: executionPolicy.evidenceThresholds,
      completionWeights: executionPolicy.completionWeights,
      schedulerWeights: executionPolicy.schedulerWeights,
      schedulerConstraints: executionPolicy.schedulerConstraints,
    };
  }
}

export const executionDomain = new ExecutionDomain();
