// ECP-023: Provider Interfaces — contracts for all domain providers
// Frozen. Every domain provider implements its respective interface.

import type { DirectiveContent, ConfidenceGates, CapabilityPolicy, DelegationMatrix, ExecutionBudget, ExecutionPolicy, TrustWeights, TrustInitialScores } from "./foundation-types";

export interface IFoundationDomain {
  getPhilosophy(): string;
  getCovenant(): string;
  getConstitution(): string;
  getNorthStar(): string;
  getManifesto(): string;
}

export interface IGovernanceDomain {
  getConfidenceGates(): ConfidenceGates;
  getSafetyBudget(): ExecutionBudget;
  getGlobalConstraints(): ExecutionBudget;
}

export interface IRuntimeDomain {
  directive(role: string): DirectiveContent | null;
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
  getPolicy(): ExecutionPolicy;
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
  trust(): ITrustDomain;

  // Legacy API (backward compat — deprecated in ECP-024)
  getDirective(role: string): string | null;
  getFoundationContext(): string;
  getConfidenceGates(): ConfidenceGates;
}
