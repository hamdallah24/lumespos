import type { BusinessCapability, CapabilityAction, RiskLevel, ComplexityLevel } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityDependency from "./CapabilityDependency";

export interface ChainStep {
  order: number;
  capabilityId: string;
  capabilityName: string;
  action: string;
  actionName: string;
  domain: string;
  ownerExecutive: string;
  dependsOn: number[];
  estimatedRisk: RiskLevel;
  estimatedComplexity: ComplexityLevel;
}

export interface CapabilityChain {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: ChainStep[];
  totalRisk: RiskLevel;
  totalComplexity: ComplexityLevel;
  requiredExecutives: string[];
  estimatedDuration: string;
}

const CHAIN_TEMPLATES: Record<string, Omit<CapabilityChain, "id" | "steps" | "totalRisk" | "totalComplexity" | "requiredExecutives"> & { actionSequence: { capabilityId: string; action: string }[] }> = {
  "restock": {
    name: "Full Restock Chain",
    description: "Detect low stock → Purchase → Receive → Update inventory",
    trigger: "stock.low",
    actionSequence: [
      { capabilityId: "cap_inventory", action: "Restock" },
      { capabilityId: "cap_purchasing", action: "CreatePurchaseOrder" },
      { capabilityId: "cap_warehouse", action: "ReceiveGoods" },
      { capabilityId: "cap_inventory", action: "AdjustStockLevels" },
    ],
    estimatedDuration: "2-5 hari",
  },
  "new_product_launch": {
    name: "New Product Launch Chain",
    description: "Market research → Production planning → Marketing → Sales launch",
    trigger: "product.launch",
    actionSequence: [
      { capabilityId: "cap_marketing", action: "MarketResearch" },
      { capabilityId: "cap_production", action: "PlanProduction" },
      { capabilityId: "cap_marketing", action: "CreateCampaign" },
      { capabilityId: "cap_sales", action: "SetPricing" },
      { capabilityId: "cap_inventory", action: "AllocateStock" },
    ],
    estimatedDuration: "4-8 minggu",
  },
  "cash_recovery": {
    name: "Cash Recovery Chain",
    description: "Cash crisis → Cost cutting → Receivable collection → Emergency funding",
    trigger: "finance.cash_negative",
    actionSequence: [
      { capabilityId: "cap_finance", action: "EmergencyFundTransfer" },
      { capabilityId: "cap_finance", action: "CostOptimization" },
      { capabilityId: "cap_finance", action: "CollectReceivables" },
      { capabilityId: "cap_finance", action: "SecureBridgeLoan" },
    ],
    estimatedDuration: "1-4 minggu",
  },
  "hire_employee": {
    name: "Hire Employee Chain",
    description: "Resignation → Succession → Recruitment → Onboarding",
    trigger: "hr.resignation",
    actionSequence: [
      { capabilityId: "cap_hr", action: "SuccessionPlan" },
      { capabilityId: "cap_hr", action: "RecruitmentRequest" },
      { capabilityId: "cap_hr", action: "OnboardNewHire" },
    ],
    estimatedDuration: "2-6 minggu",
  },
  "campaign_execution": {
    name: "Campaign Execution Chain",
    description: "Brief → Creative → Media buy → Launch → Monitor",
    trigger: "marketing.campaign_failed",
    actionSequence: [
      { capabilityId: "cap_marketing", action: "AnalyzeFailure" },
      { capabilityId: "cap_marketing", action: "OptimizeStrategy" },
      { capabilityId: "cap_marketing", action: "CreateCampaign" },
      { capabilityId: "cap_sales", action: "SetPricing" },
    ],
    estimatedDuration: "1-3 minggu",
  },
  "emergency_procurement": {
    name: "Emergency Procurement Chain",
    description: "Emergency order → Supplier sourcing → Receive → Pay",
    trigger: "purchasing.emergency",
    actionSequence: [
      { capabilityId: "cap_purchasing", action: "EmergencyOrder" },
      { capabilityId: "cap_purchasing", action: "SourceSupplier" },
      { capabilityId: "cap_warehouse", action: "ReceiveGoods" },
      { capabilityId: "cap_finance", action: "ProcessPayment" },
    ],
    estimatedDuration: "1-3 hari",
  },
  "branch_expansion": {
    name: "Branch Expansion Chain",
    description: "Feasibility → Funding → Build → Hire → Launch",
    trigger: "expansion.opportunity",
    actionSequence: [
      { capabilityId: "cap_expansion", action: "ConductFeasibilityStudy" },
      { capabilityId: "cap_finance", action: "FundExpansion" },
      { capabilityId: "cap_expansion", action: "SetupBranch" },
      { capabilityId: "cap_hr", action: "StaffBranch" },
      { capabilityId: "cap_sales", action: "LaunchOperations" },
    ],
    estimatedDuration: "3-6 bulan",
  },
  "security_incident": {
    name: "Security Incident Response Chain",
    description: "Detect → Contain → Investigate → Fix → Report",
    trigger: "platform.security_breach",
    actionSequence: [
      { capabilityId: "cap_platform", action: "IncidentResponse" },
      { capabilityId: "cap_platform", action: "SecurityHardening" },
      { capabilityId: "cap_platform", action: "AuditAccess" },
    ],
    estimatedDuration: "1-5 hari",
  },
};

export function getAvailableChains(): { id: string; name: string; description: string; trigger: string }[] {
  return Object.entries(CHAIN_TEMPLATES).map(([id, t]) => ({ id, name: t.name, description: t.description, trigger: t.trigger }));
}

export function buildChain(chainId: string): CapabilityChain | null {
  const template = CHAIN_TEMPLATES[chainId];
  if (!template) return null;

  const steps: ChainStep[] = [];
  const requiredExecs = new Set<string>();
  const risks: RiskLevel[] = [];
  const complexities: ComplexityLevel[] = [];

  for (let i = 0; i < template.actionSequence.length; i++) {
    const seq = template.actionSequence[i];
    const cap = CapabilityRegistry.getCapabilityById(seq.capabilityId);
    const action = cap?.supportedActions.find(a => a.name === seq.action) ?? null;
    const dependsOn: number[] = [];

    if (cap) requiredExecs.add(cap.ownerExecutive);
    if (action) {
      risks.push(action.riskLevel);
      complexities.push(action.riskLevel as ComplexityLevel);
    }

    const deps = CapabilityDependency.getDependencies(seq.capabilityId);
    for (const dep of deps) {
      const depIdx = template.actionSequence.findIndex(a => a.capabilityId === dep);
      if (depIdx >= 0) dependsOn.push(depIdx + 1);
    }

    steps.push({
      order: i + 1,
      capabilityId: seq.capabilityId,
      capabilityName: cap?.name ?? seq.capabilityId,
      action: seq.action,
      actionName: action?.purpose ?? seq.action,
      domain: cap?.domain ?? "unknown",
      ownerExecutive: cap?.ownerExecutive ?? "unknown",
      dependsOn,
      estimatedRisk: action?.riskLevel ?? "medium",
      estimatedComplexity: cap?.estimatedComplexity ?? "moderate",
    });
  }

  const totalRisk: RiskLevel = risks.includes("critical") ? "critical" : risks.includes("high") ? "high" : risks.includes("medium") ? "medium" : "low";
  const totalComplexity: ComplexityLevel = complexities.includes("very_complex") ? "very_complex" : complexities.includes("complex") ? "complex" : complexities.includes("moderate") ? "moderate" : "simple";

  return {
    id: `chain-${chainId}-${Date.now()}`,
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    steps,
    totalRisk,
    totalComplexity,
    requiredExecutives: [...requiredExecs],
    estimatedDuration: template.estimatedDuration,
  };
}

export function buildChainForTrigger(trigger: string): CapabilityChain | null {
  const entry = Object.entries(CHAIN_TEMPLATES).find(([, t]) => t.trigger === trigger);
  if (!entry) return null;
  return buildChain(entry[0]);
}

export function buildAllChains(): CapabilityChain[] {
  return Object.keys(CHAIN_TEMPLATES).map(id => buildChain(id)).filter((c): c is CapabilityChain => c !== null);
}
