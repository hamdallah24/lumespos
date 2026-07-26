export type CapabilityDomain = "inventory" | "sales" | "finance" | "hr" | "production" | "purchasing" | "warehouse" | "crm" | "marketing" | "expansion" | "platform";
export type ApprovalLevel = "none" | "manager" | "director" | "ceo" | "founder";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ComplexityLevel = "simple" | "moderate" | "complex" | "very_complex";
export type CapabilityStatus = "active" | "deprecated" | "beta" | "disabled";
export type CapabilityExecutionType = "immediate" | "scheduled" | "async" | "manual";
export type PlanStatus = "draft" | "validated" | "in_progress" | "completed" | "failed";

export interface CapabilityAction {
  name: string;
  purpose: string;
  whenUsed: string;
  requiredContext: string[];
  approvalLevel: ApprovalLevel;
  riskLevel: RiskLevel;
  eventsGenerated: string[];
  executionHandler: string;
  kpisAffected: string[];
  businessConstraints: string[];
  rollbackStrategy?: string;
  examples: string[];
}

export interface BusinessCapability {
  id: string;
  name: string;
  description: string;
  domain: CapabilityDomain;
  version: string;
  ownerExecutive: string;
  supportedActions: CapabilityAction[];
  requiredApprovals: ApprovalLevel[];
  requiredRoles: string[];
  requiredContext: string[];
  requiredCapabilities: string[];
  generatedEvents: string[];
  affectedKPIs: string[];
  executionHandler: string;
  estimatedRisk: RiskLevel;
  estimatedComplexity: ComplexityLevel;
  dependencies: string[];
  postConditions: string[];
  rollbackStrategy: string;
  executionType: CapabilityExecutionType;
  status: CapabilityStatus;
  tags: string[];
  examples: string[];
}

export interface CapabilityPlanStep {
  stepId: string;
  order: number;
  action: string;
  capabilityId: string;
  description: string;
  dependsOn: string[];
  requiredContext: Record<string, unknown>;
  estimatedRisk: RiskLevel;
  estimatedComplexity: ComplexityLevel;
  ownerExecutive: string;
  status: PlanStatus;
  result?: string;
}

export interface CapabilityPlan {
  planId: string;
  title: string;
  objective: string;
  steps: CapabilityPlanStep[];
  totalRisk: RiskLevel;
  totalComplexity: ComplexityLevel;
  requiredCapabilities: string[];
  requiredExecutives: string[];
  estimatedDuration: string;
  status: PlanStatus;
  createdAt: string;
}

export interface CapabilityGraphNode {
  capabilityId: string;
  name: string;
  domain: CapabilityDomain;
  ownerExecutive: string;
}

export interface CapabilityGraphEdge {
  from: string;
  to: string;
  type: "depends_on" | "triggers" | "shares_context";
}

export interface CapabilitySearchResult {
  capability: BusinessCapability;
  matchType: "exact" | "domain" | "action" | "keyword";
  matchReason: string;
  relevantActions: string[];
}

export interface CapabilityRecommendationResult {
  capabilityId: string;
  action: string;
  score: number;
  reason: string;
  requiredApproval: ApprovalLevel;
  riskLevel: RiskLevel;
  dependencies: string[];
}

export interface CapabilityContextEntry {
  id: string;
  name: string;
  domain: CapabilityDomain;
  ownerExecutive: string;
  actions: { name: string; purpose: string; approvalLevel: ApprovalLevel; riskLevel: RiskLevel }[];
  requiredCapabilities: string[];
  status: CapabilityStatus;
}

export interface CapabilityExecutiveContext {
  availableCapabilities: CapabilityContextEntry[];
  recommendedCapabilities: CapabilityRecommendationResult[];
  blockedCapabilities: { capabilityId: string; reason: string }[];
  dependencySummary: { capabilityId: string; dependsOn: string[]; dependedBy: string[] }[];
}

export interface ValidationResult {
  valid: boolean;
  capabilityId: string;
  action: string;
  issues: { field: string; message: string; severity: "error" | "warning" }[];
}
