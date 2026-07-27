import type { RuntimeContext } from '../runtime-intelligence-core/types';
import type {
  COOContext, CFOContext, MarketingContext, PeopleContext as PeopleCtx,
  IntelligenceContext, CompanyContext, KnowledgeContext, EngineeringContext,
} from './types';

export function mapToCOOContext(rc: RuntimeContext): COOContext {
  const erp = rc.erpContexts ?? {};
  const inventory = (erp as any).inventory ?? {};
  const sales = (erp as any).sales ?? {};
  const production = (erp as any).production ?? {};
  const suppliers = (erp as any).suppliers ?? {};
  const alerts: COOContext["alerts"] = [];

  if (inventory.health === "critical") {
    alerts.push({ type: "inventory", severity: "critical", message: "Inventory dalam kondisi kritis" });
  }
  if (inventory.criticalItems?.length > 0) {
    alerts.push({ type: "inventory", severity: "warning", message: `${inventory.criticalItems.length} item perlu restock` });
  }

  return {
    inventory,
    sales,
    production,
    suppliers,
    branches: extractBranches(rc),
    alerts,
  };
}

export function mapToCFOContext(rc: RuntimeContext): CFOContext {
  const erp = rc.erpContexts ?? {};
  return {
    finance: (erp as any).finance ?? { revenue: { total: 0 }, profit: { gross: 0, margin: 0 }, cashPosition: { current: 0 } },
    sales: (erp as any).sales ?? { today: { revenue: 0 } },
    branches: extractBranches(rc),
  };
}

export function mapToMarketingContext(rc: RuntimeContext): MarketingContext {
  const erp = rc.erpContexts ?? {};
  return {
    sales: (erp as any).sales ?? { today: { revenue: 0 }, topProducts: [] },
    products: [],
    branches: extractBranches(rc),
  };
}

export function mapToPeopleContext(rc: RuntimeContext): PeopleCtx {
  const erp = rc.erpContexts ?? {};
  return {
    people: (erp as any).people ?? { headcount: { total: 0, active: 0, byDepartment: [] } },
    branches: extractBranches(rc),
  };
}

export function mapToIntelligenceContext(rc: RuntimeContext): IntelligenceContext {
  return {
    knowledgeStats: rc.erpContexts ? { total: 0, semantic: 0, episode: 0, procedural: 0 } : { total: 0, semantic: 0, episode: 0, procedural: 0 },
    systemHealth: { status: "healthy", uptime: 0, activeMissions: 0 },
    platformMetrics: {
      totalRequests: 0,
      avgConfidence: rc.runtime.confidence.overall,
      degradedRate: rc.metadata.degraded ? 1 : 0,
    },
  };
}

export function mapToCompanyContext(rc: RuntimeContext): CompanyContext {
  const erp = rc.erpContexts ?? {};
  const finance = (erp as any).finance ?? {};
  const inventory = (erp as any).inventory ?? {};
  const flags: string[] = [];
  if (finance.financialHealth?.score < 50) flags.push("Financial health kritis");
  if (inventory.health === "critical") flags.push("Inventory kritis");
  const healthScore = finance.financialHealth?.score ?? 70;

  return {
    companyHealth: { score: healthScore, flags, trend: healthScore > 70 ? "up" : "stable" },
    risks: [
      ...(finance.risks ?? []),
      ...(inventory.stockRisks ?? []),
    ],
    pendingApprovals: [],
    operational: {
      revenue: finance.revenue?.total ?? 0,
      profit: finance.profit?.gross ?? 0,
      cashPosition: finance.cashPosition?.current ?? 0,
    },
    activeMissions: [],
  };
}

export function mapToKnowledgeContext(rc: RuntimeContext): KnowledgeContext {
  return {
    knowledge: { total: 0, byDomain: [], topTopics: [] },
    learning: { totalOutcomes: 0, successRate: 0, lastMaintenance: "N/A" },
    memory: {
      totalEntries: rc.grounding.memory.entries.length,
      workingSize: rc.grounding.memory.entries.length,
      organizationalSize: 0,
    },
  };
}

export function mapToEngineeringContext(rc: RuntimeContext): EngineeringContext {
  return {
    repository: rc.grounding.repository.map(f => ({ path: f.path, fileCount: 1 })),
    deployment: { status: "unknown", lastDeploy: "N/A", pendingChanges: 0 },
    systemMetrics: { healthScore: rc.runtime.confidence.overall * 100, activeTools: rc.planning.suggestedTools.length, pipelineStatus: rc.metadata.degraded ? "degraded" : "healthy" },
  };
}

function extractBranches(rc: RuntimeContext): { id: number; name: string; location?: string }[] {
  const opData = rc.grounding.operational;
  if (Array.isArray(opData)) {
    for (const entry of opData) {
      if (entry.type === "branches" && Array.isArray(entry.data)) {
        return entry.data.map((b: any) => ({ id: b.id ?? 0, name: b.name ?? "", location: b.location }));
      }
      if (entry.type === "branch" && entry.data) {
        const d = entry.data as any;
        return [{ id: d.id ?? 0, name: d.name ?? "", location: d.location }];
      }
    }
  }
  return [{ id: Number(rc.erpContexts?.["branchId"]) || 1, name: "Main Branch" }];
}

export type ContextMap = {
  COO: COOContext;
  CFO: CFOContext;
  CMO: MarketingContext;
  CHRO: PeopleCtx;
  CAIO: IntelligenceContext;
  CEO: CompanyContext;
  CKO: KnowledgeContext;
  CTO: EngineeringContext;
};

const mappers: Record<string, (rc: RuntimeContext) => any> = {
  COO: mapToCOOContext,
  CFO: mapToCFOContext,
  CMO: mapToMarketingContext,
  CHRO: mapToPeopleContext,
  CAIO: mapToIntelligenceContext,
  CEO: mapToCompanyContext,
  CKO: mapToKnowledgeContext,
  CTO: mapToEngineeringContext,
};

const DEFAULT_RC: RuntimeContext = {
  metadata: { model: "", version: "", degraded: false, contractId: "", createdAt: new Date().toISOString() },
  intelligence: { intent: "", confidence: { provenance: { intentConfidence: 0 } }, domain: { primary: "" } },
  planning: { tasks: [], suggestedTools: [] },
  grounding: { knowledge: [], memory: { entries: [], type: "working" }, repository: [], operational: [] },
  verification: { checks: [] },
  runtime: { confidence: { overall: 0.5, provenance: { intentConfidence: 0.5, domainConfidence: 0.5, groundingConfidence: 0.5, planningConfidence: 0.5, verificationConfidence: 0.5 }, weakAreas: [] } },
  erpContexts: {},
  operationalState: { timestamp: Date.now() },
};

export function mapContextForRole(role: string, rc: RuntimeContext): any {
  const mapper = mappers[role];
  if (!mapper) return {};
  return mapper(rc || DEFAULT_RC);
}
