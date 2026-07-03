// ECP-023: Execution Domain — budget, anti-loop, scheduler, completion
// ECP-025: Reads from execution-policy.ts (to be migrated to Foundation in ECP-026).

import type { IExecutionDomain } from "../types/provider-interfaces";
import type { ExecutionBudget } from "../types/foundation-types";
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
}

export const executionDomain = new ExecutionDomain();
