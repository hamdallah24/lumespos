// SPRINT 9.4: Execution Specification
// Law #008: Structured contract that the ENTIRE pipeline reads.
// Not a prompt. Not a keyword list. A contract.

import type { SemanticContract } from "./semantic-engine";
import { PolicyRegistry } from "./policy/registry";
import type { RuntimePolicy } from "./policy/types";

export interface ExecutionSpec {
  // ── From Semantic Engine ──
  intent: string;
  problem: string;
  domain: string;
  entities: string[];
  confidence: number;
  risk: string;
  missingContext: string[];

  // ── Policy Resolution ──
  runtimePolicy: RuntimePolicy;

  // ── Execution Plan ──
  toolSet: "READ_TOOLS" | "DEVOPS_TOOLS" | "NONE" | "BUSINESS";
  needsApproval: boolean;
  complexity: "simple" | "medium" | "complex";

  // ── Validation ──
  valid: boolean;
  rejectionReason?: string;
}

/** Build ExecutionSpec from SemanticContract */
export function buildSpec(contract: SemanticContract): ExecutionSpec {
  const policy = PolicyRegistry.get(contract.intent);

  // Resolve tool set from policy
  let toolSet: ExecutionSpec["toolSet"] = "READ_TOOLS";
  if (policy.tools === "devops") toolSet = "DEVOPS_TOOLS";
  if (policy.tools === "none") toolSet = "NONE";
  if (policy.tools === "business") toolSet = "BUSINESS";

  // Resolve complexity
  let complexity: ExecutionSpec["complexity"] = "medium";
  if (contract.risk === "high") complexity = "complex";
  if (contract.intent === "greeting") complexity = "simple";
  if (contract.confidence < 70) complexity = "medium";

  // Resolve approval
  const needsApproval = policy.approval || complexity === "complex";

  return {
    intent: contract.intent,
    problem: contract.problem,
    domain: contract.domain,
    entities: contract.entities,
    confidence: contract.confidence,
    risk: contract.risk,
    missingContext: contract.missingContext,
    runtimePolicy: policy,
    toolSet,
    needsApproval,
    complexity,
    valid: true,
  };
}

export const executionSpec = {
  name: "ExecutionSpec",
  version: "1.0.0",
  capabilities: ["execution-planning", "policy-resolution", "contract-building"],
  dependencies: ["PolicyRegistry"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
