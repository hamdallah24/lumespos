// SPRINT 9.2: Policy Validator — enforces policy at each pipeline stage
import { RuntimePolicy } from "./types";

export interface PolicyViolation {
  stage: string;
  policy: string;
  violation: string;
  severity: "warning" | "error";
}

export interface ComplianceResult {
  compliant: boolean;
  violations: PolicyViolation[];
}

/** Validate that pipeline stage is compliant with policy */
export function validateStage(stage: string, policy: RuntimePolicy, actual: string): PolicyViolation | null {
  switch (stage) {
    case "knowledge": {
      if (policy.knowledge === "none" && actual !== "skipped") {
        return { stage, policy: policy.knowledge, violation: `Knowledge loaded but policy says "none"`, severity: "warning" };
      }
      break;
    }
    case "manifest": {
      if (!policy.manifest && actual === "loaded") {
        return { stage, policy: policy.manifest ? "true" : "false", violation: `Manifest loaded but policy says "false"`, severity: "warning" };
      }
      break;
    }
    case "sharedContext": {
      if (!policy.sharedContext && actual === "loaded") {
        return { stage, policy: policy.sharedContext ? "true" : "false", violation: `Shared context loaded but policy says "false"`, severity: "warning" };
      }
      break;
    }
    case "tools": {
      if (policy.tools === "none" && actual !== "none") {
        return { stage, policy: policy.tools, violation: `Tools used but policy says "none"`, severity: "error" };
      }
      if (policy.tools === "read_only" && actual === "devops") {
        return { stage, policy: policy.tools, violation: `DevOps tools used but policy says "read_only"`, severity: "error" };
      }
      break;
    }
  }
  return null;
}

/** Validate all pipeline stages */
export function validateAll(policy: RuntimePolicy, stages: Record<string, string>): ComplianceResult {
  const violations: PolicyViolation[] = [];
  for (const [stage, actual] of Object.entries(stages)) {
    const v = validateStage(stage, policy, actual);
    if (v) violations.push(v);
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

export const policyValidator = {
  name: "PolicyValidator",
  version: "1.0.0",
  capabilities: ["policy-enforcement", "stage-validation", "compliance-check"],
  dependencies: ["PolicyRegistry"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
