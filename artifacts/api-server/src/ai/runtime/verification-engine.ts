// SPRINT 9.5: Verification Runtime
// Law #008: Stop before execution if contract fails validation.
// Confidence too low? Domain unknown? Capability mismatch? STOP.

import type { ExecutionSpecificationV1 } from "./execution-spec";

interface VerificationResult {
  passed: boolean;
  stopReason?: string;
  warnings: string[];
}

/** Verify the ExecutionSpec before any planning or execution occurs */
export function verify(spec: ExecutionSpecificationV1): VerificationResult {
  const warnings: string[] = [];

  // Gate 1: Confidence threshold
  if (spec.confidence < 40) {
    return { passed: false, stopReason: `Confidence too low (${spec.confidence}%). Ask Founder for clarification.`, warnings };
  }
  if (spec.confidence < 60) {
    warnings.push(`Low confidence (${spec.confidence}%). Proceeding but results may be imprecise.`);
  }

  // Gate 2: Known domain?
  const validDomains = ["inventory", "products", "architecture", "devops", "business", "knowledge", "general"];
  if (!validDomains.includes(spec.domain)) {
    warnings.push(`Unknown domain "${spec.domain}". Treating as general.`);
  }

  // Gate 3: Missing context?
  if (spec.entities.length === 0 && spec.intent !== "greeting") {
    warnings.push("No entities extracted. Response may lack specificity.");
  }

  // Gate 4: Greetings with tools?
  if (spec.intent === "greeting" && spec.executionMode !== "direct") {
    return { passed: false, stopReason: "Greeting should not trigger tools or complex execution.", warnings };
  }

  // Gate 5: DevOps without approval?
  if (spec.executionMode === "approved" && spec.intent === "devops_operation") {
    if (!spec.approvalRequired) {
      return { passed: false, stopReason: "DevOps operations require Founder approval.", warnings };
    }
  }

  return { passed: true, warnings };
}

export const verificationEngine = {
  name: "VerificationEngine",
  version: "1.0.0",
  capabilities: ["contract-validation", "confidence-gating", "domain-checking"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
