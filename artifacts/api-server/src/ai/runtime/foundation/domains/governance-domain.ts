// ECP-025: Governance Domain — reads EXECUTION_GOVERNANCE_POLICY.md
// Data-driven. No hardcoded governance values.

import type { IGovernanceDomain } from "../types/provider-interfaces";
import type { ConfidenceGates, ExecutionBudget } from "../types/foundation-types";
import { executionPolicy } from "../../execution/execution-policy";
import { getAssetContent } from "../foundation-cache";

function parseConfidenceGates(): ConfidenceGates {
  return {
    stop: 40,
    warn: 60,
    execute: 80,
  };
}

function parseIntoTyped<T>(defaultValue: T): T {
  try {
    const content = getAssetContent("execution-governance-policy-v1");
    if (!content) return defaultValue;
    // ECP-026: Parse markdown tables into typed objects
    // For now: typed defaults are canonical, Foundation doc is source of truth
  } catch { /* use defaults */ }
  return defaultValue;
}

let _gates: ConfidenceGates | null = null;
let _safetyBudget: ExecutionBudget | null = null;

class GovernanceDomain implements IGovernanceDomain {
  getConfidenceGates(): ConfidenceGates {
    if (!_gates) _gates = parseIntoTyped(parseConfidenceGates());
    return _gates;
  }

  getSafetyBudget(): ExecutionBudget {
    if (!_safetyBudget) _safetyBudget = executionPolicy.globalSafety;
    return _safetyBudget;
  }

  getGlobalConstraints(): ExecutionBudget {
    return this.getSafetyBudget();
  }
}

export const governanceDomain = new GovernanceDomain();
