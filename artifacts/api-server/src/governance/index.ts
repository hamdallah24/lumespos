export * from "./core";
export * from "./policies";
export * from "./providers";
export { governanceEngine } from "./governance-engine";
export { orgPolicyEngine } from "./policy-engine";
export { complianceEngine } from "./compliance-engine";
export { riskEngine } from "./risk-engine";
export { qualityEngine } from "./quality-engine";
export { improvementEngine } from "./improvement-engine";
export { executiveAuditor } from "./executive-auditor";

import { GovernanceProvider } from "./providers";

let initialized = false;

export function initializeGovernance(): void {
  if (initialized) return;
  GovernanceProvider.initialize();
  initialized = true;
  console.log(`[GV] Governance initialized — Policy Engine + Permissions + Audit + Compliance ready`);
}
