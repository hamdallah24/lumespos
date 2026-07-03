// ECP-023: Foundation — public API
// Single entry point for all Foundation access.
// Import this module, not individual domain files.

export { getFoundationProvider, FoundationProvider } from "./foundation-provider";
export type { IFoundationProvider } from "./types/provider-interfaces";
export { getCache, invalidateCache } from "./foundation-cache";

// Domain providers (for direct access during ECP-024 migration)
export { foundationDomain } from "./domains/foundation-domain";
export { governanceDomain } from "./domains/governance-domain";
export { runtimeDomain } from "./domains/runtime-domain";
export { capabilityDomain } from "./domains/capability-domain";
export { delegationDomain } from "./domains/delegation-domain";
export { executionDomain } from "./domains/execution-domain";
export { trustDomain } from "./domains/trust-domain";
