// ECP-046: Governance Types — Shared types for Governance Operating System
// Rules, audits, quality, risks, improvements. Centralized policy.

export type ExecutiveRole = "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CHRO" | "CIO" | "CAIO" | "CKO";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AuditStatus = "PASS" | "WARNING" | "FAIL";

// ── Architecture Audit ──

export interface ArchitectureViolation {
  rule: string;
  description: string;
  layer: string;
  severity: Severity;
  location?: string;
}

export interface TechnicalDebt {
  id: string;
  description: string;
  impact: Severity;
  accumulatedAt: string;
  resolved?: boolean;
}

export interface ArchitectureAudit {
  score: number;
  violations: ArchitectureViolation[];
  technicalDebt: TechnicalDebt[];
  recommendations: string[];
  auditedAt: string;
}

// ── Executive Audit ──

export interface ExecutiveAudit {
  executive: ExecutiveRole;
  score: number;
  strengths: string[];
  weaknesses: string[];
  actions: string[];
  recentMissions: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  auditedAt: string;
}

// ── Quality Metrics ──

export interface MetricTrend {
  metric: string;
  values: number[];
  direction: "UP" | "DOWN" | "FLAT";
  threshold: number;
  breached: boolean;
}

export interface QualityAlert {
  metric: string;
  message: string;
  severity: Severity;
  detectedAt: string;
}

export interface QualityMetrics {
  organizationScore: number;
  successRate: number;
  failureRate: number;
  avgConfidence: number;
  knowledgeReinforcement: number;
  consensusAccuracy: number;
  avgDuration: number;
  tokenEfficiency: number;
  trends: MetricTrend[];
  alerts: QualityAlert[];
  evaluatedAt: string;
}

// ── Risk Assessment ──

export interface RiskAssessment {
  id: string;
  category: string;
  risk: string;
  severity: Severity;
  probability: number;
  mitigation: string;
  detectedAt: string;
  status: "ACTIVE" | "MITIGATED" | "ACCEPTED";
}

// ── Improvement ──

export type ImprovementPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ImprovementPlan {
  id: string;
  priority: ImprovementPriority;
  component: string;
  recommendation: string;
  expectedImpact: number;
  targetMetric: string;
  createdAt: string;
  implemented: boolean;
}

// ── Policy ──

export interface OrganizationPolicy {
  minimalConfidence: number;
  minimalEvidence: number;
  delegationThreshold: number;
  consensusThreshold: number;
  learningThreshold: number;
  knowledgeValidationCount: number;
  auditIntervalMs: number;
  maxRetries: number;
  maxConcurrentMissions: number;
  tokenBudgetLimit: number;
  reputationDecayDays: number;
}

// ── Compliance ──

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  check: () => AuditStatus;
  layer: string;
}

export interface ComplianceResult {
  ruleId: string;
  name: string;
  status: AuditStatus;
  message: string;
  checkedAt: string;
}

// ── Governance Report ──

export interface GovernanceReport {
  generatedAt: string;
  architecture: ArchitectureAudit;
  executives: ExecutiveAudit[];
  quality: QualityMetrics;
  risks: RiskAssessment[];
  improvements: ImprovementPlan[];
  compliance: ComplianceResult[];
  overallScore: number;
}

// ── Factory ──

let _debtCounter = 0;
let _riskCounter = 0;
let _improvementCounter = 0;

export function createDebtId(): string { _debtCounter++; return `DEBT-${Date.now().toString(36)}-${_debtCounter}`; }
export function createRiskId(): string { _riskCounter++; return `RISK-${Date.now().toString(36)}-${_riskCounter}`; }
export function createImprovementId(): string { _improvementCounter++; return `IMP-${Date.now().toString(36)}-${_improvementCounter}`; }

// ── Default Policy ──

export const DEFAULT_POLICY: OrganizationPolicy = {
  minimalConfidence: 60,
  minimalEvidence: 2,
  delegationThreshold: 70,
  consensusThreshold: 60,
  learningThreshold: 50,
  knowledgeValidationCount: 2,
  auditIntervalMs: 60000,
  maxRetries: 3,
  maxConcurrentMissions: 5,
  tokenBudgetLimit: 200000,
  reputationDecayDays: 30,
};
