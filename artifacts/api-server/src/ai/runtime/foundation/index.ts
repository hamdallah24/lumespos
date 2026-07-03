// ECP-025: Foundation — public API
// Single entry point for all Foundation access.

export { getFoundationProvider, FoundationProvider } from "./foundation-provider";
export type { IFoundationProvider } from "./types/provider-interfaces";
export { getCache, invalidateCache } from "./foundation-cache";

// Domain providers
export { foundationDomain } from "./domains/foundation-domain";
export { governanceDomain } from "./domains/governance-domain";
export { runtimeDomain } from "./domains/runtime-domain";
export { capabilityDomain } from "./domains/capability-domain";
export { delegationDomain } from "./domains/delegation-domain";
export { executionDomain } from "./domains/execution-domain";
export { verificationDomain } from "./domains/verification-domain";
export { trustDomain } from "./domains/trust-domain";

// Types
export type {
  ConfidenceGates, CapabilityPolicy, ExecutionBudget,
  DelegationMatrix, TrustWeights, TrustInitialScores,
  DomainConfidence, ApprovalRule, EvidenceRequirement,
  TrustThreshold, DecayRule, RecoveryRule,
  VerificationPolicyData, TrustPolicyData,
  DelegationPolicyData, ExecutionGovernancePolicyData,
  DocumentMeta,
} from "./types/foundation-types";
