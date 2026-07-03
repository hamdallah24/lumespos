// ECP-023: Foundation Types — shared type definitions
// Frozen. Used by all Foundation domain providers.

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

export interface DirectiveContent {
  directive: string;
  authority: string;
  forbiddenActions: string[];
  requiredBehaviors: string[];
  delegates: Record<string, string>;
}

export interface ConfidenceGates {
  stop: number;
  warn: number;
}

export interface CapabilityPolicy {
  capability: string;
  minMaturity: string;
  requiresEvidence: boolean;
  requiresApproval: boolean;
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

export interface ExecutionBudget {
  maxTokens: number;
  maxTools: number;
  maxTimeMs: number;
  maxIdleCycles: number;
}

export interface ExecutionPolicy {
  budgetMatrix: Record<string, ExecutionBudget>;
  globalSafety: ExecutionBudget;
  antiLoop: Record<string, number>;
  evidenceThresholds: Record<string, number>;
  completionWeights: { executionProgress: number; assignmentProgress: number };
  schedulerWeights: Record<string, number>;
  schedulerConstraints: { maxLoadBeforeSkip: number; maxQueueDepth: number };
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
