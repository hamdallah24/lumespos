// ECP-025: Provider Interfaces — extended with VerificationDomain
// Frozen. Every domain provider implements its respective interface.

import type { ConfidenceGates, ExecutionBudget, CapabilityPolicy, DelegationMatrix, TrustWeights, TrustInitialScores, DomainConfidence, ExecutionBudget as BudgetLimit } from "./foundation-types";

export interface IFoundationDomain {
  getPhilosophy(): string;
  getCovenant(): string;
  getConstitution(): string;
  getNorthStar(): string;
  getManifesto(): string;
}

export interface IGovernanceDomain {
  getConfidenceGates(): ConfidenceGates;
  getSafetyBudget(): BudgetLimit;
  getGlobalConstraints(): BudgetLimit;
}

export interface IRuntimeDomain {
  directive(role: string): { directive: string; authority: string; forbiddenActions: string[]; requiredBehaviors: string[]; delegates: Record<string, string> } | null;
  authority(role: string): string | null;
  forbiddenActions(role: string): string[];
  requiredBehaviors(role: string): string[];
  delegates(role: string): Record<string, string>;
}

export interface ICapabilityDomain {
  getForRole(role: string): CapabilityPolicy[];
  getAllowedCapabilities(role: string): string[];
  getEvidenceRequirement(capability: string): boolean;
  getApprovalRequirement(capability: string): boolean;
}

export interface IDelegationDomain {
  getHierarchy(): string;
  getFallback(): { runtime: string; runtimeId: string };
  getRoutingMatrix(): DelegationMatrix;
  canDelegate(from: string, to: string): boolean;
}

export interface IExecutionDomain {
  getBudget(complexity: string): ExecutionBudget;
  getAntiLoopThreshold(complexity: string): number;
  getEvidenceThreshold(complexity: string): number;
  getCompletionWeights(): { executionProgress: number; assignmentProgress: number };
}

export interface IVerificationDomain {
  minimumConfidence(domain: string): number;
  domainPolicy(domain: string): DomainConfidence | null;
  approvalRequirement(intent: string): { required: boolean; description: string };
  evidenceRules(action: string): string | null;
  allDomains(): string[];
}

export interface ITrustDomain {
  getWeights(): TrustWeights;
  getDimensions(): string[];
  initialScores(): TrustInitialScores;
  threshold(): number;
}

export interface IFoundationProvider {
  readonly fingerprint: string;
  readonly documentCount: number;
  readonly loadedAt: number;

  foundation(): IFoundationDomain;
  governance(): IGovernanceDomain;
  runtime(role?: string): IRuntimeDomain;
  capability(): ICapabilityDomain;
  delegation(): IDelegationDomain;
  execution(): IExecutionDomain;
  verification(): IVerificationDomain;
  trust(): ITrustDomain;

  // @deprecated Legacy API — removed in ECP-027
  getDirective(role: string): string | null;
  getFoundationContext(): string;
  getConfidenceGates(): ConfidenceGates;
}
