// ECP-023: Governance Domain — confidence gates, safety budget, approval
// Frozen. Enforced by VerificationEngine + Governor.

import type { IGovernanceDomain } from "../types/provider-interfaces";
import type { ConfidenceGates, ExecutionBudget } from "../types/foundation-types";
import { executionPolicy } from "../../execution/execution-policy";

class GovernanceDomain implements IGovernanceDomain {
  getConfidenceGates(): ConfidenceGates {
    return {
      stop: 40,
      warn: 60,
    };
  }

  getSafetyBudget(): ExecutionBudget {
    return executionPolicy.globalSafety;
  }

  getGlobalConstraints(): ExecutionBudget {
    return executionPolicy.globalSafety;
  }
}

export const governanceDomain = new GovernanceDomain();
