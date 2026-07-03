// ECP-025: Foundation Types — typed models replacing any/unknown
// Frozen. All domain providers use these types.
// Every policy value traces to a Foundation document.

export interface DocumentMeta {
  id: string;
  title: string;
  artifact_type: string;
  lifecycle: string;
  stability: string;
  version: string;
  knowledge_level: string;
  loading_strategy: string;
  last_updated: string;
  depends_on: string[];
  authorized_consumers: string[];
}

export interface FoundationCache {
  fingerprint: string;
  generatedAt: string;
  documentCount: number;
  documents: DocumentMeta[];
  loadedAt: number;
}

export interface ConfidenceGates {
  stop: number;
  warn: number;
  execute: number;
}

export interface ExecutionBudget {
  maxTokens: number;
  maxTools: number;
  maxTimeMs: number;
  maxIdleCycles: number;
}

export interface CapabilityPolicy {
  capability: string;
  minMaturity: string;
  requiresEvidence: boolean;
  requiresApproval: boolean;
  description: string;
}

export interface RoutingEntry {
  domain: string;
  runtime: string;
  runtimeId: string;
}

export interface DelegationMatrix {
  routes: RoutingEntry[];
  fallback: string;
  fallbackId: string;
}

export interface TrustWeights {
  technicalAccuracy: number;
  deploymentReliability: number;
  proposalQuality: number;
  securityCompliance: number;
  communication: number;
  responseTime: number;
}

export interface TrustInitialScores {
  technicalAccuracy: number;
  deploymentReliability: number;
  proposalQuality: number;
  communication: number;
  securityCompliance: number;
  responseTime: number;
}

export interface DomainConfidence {
  domain: string;
  minimum: number;
  reason: string;
}

export interface ApprovalRule {
  intent: string;
  approvalRequired: boolean;
  description: string;
}

export interface EvidenceRequirement {
  action: string;
  evidence: string;
}

export interface TrustThreshold {
  minScore: number;
  maxScore: number;
  level: string;
  behavior: string;
}

export interface DecayRule {
  event: string;
  scoreChange: number;
  dimension: string;
}

export interface RecoveryRule {
  event: string;
  scoreChange: number;
  dimension: string;
  maxCap: number;
}

export interface EvidenceWeight {
  type: string;
  weight: number;
}

export interface VerificationPolicyData {
  domains: DomainConfidence[];
  approvalRules: ApprovalRule[];
  evidenceRequirements: EvidenceRequirement[];
}

export interface TrustPolicyData {
  weights: Record<string, number>;
  dimensions: string[];
  initialScores: Record<string, number>;
  thresholds: TrustThreshold[];
  decay: DecayRule[];
  recovery: RecoveryRule[];
  evidenceWeights: EvidenceWeight[];
  historyWindow: number;
  minEvents: number;
}

export interface DelegationPolicyData {
  hierarchy: string;
  routingMatrix: DelegationMatrix;
  fallbackChain: string[];
  circularRules: string[];
  maturityGating: Record<string, string>;
}

export interface ExecutionGovernancePolicyData {
  confidenceGates: ConfidenceGates;
  safetyBudget: ExecutionBudget;
  budgetMatrix: Record<string, ExecutionBudget>;
  antiLoop: Record<string, number>;
  evidenceThresholds: Record<string, number>;
  completionWeights: { executionProgress: number; assignmentProgress: number };
  schedulerWeights: Record<string, number>;
  schedulerConstraints: { maxLoadBeforeSkip: number; maxQueueDepth: number };
}
