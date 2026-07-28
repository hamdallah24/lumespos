import type { RuntimeContext } from '../runtime-intelligence-core/types';
import type {
  COOContext, CFOContext, MarketingContext, PeopleContext as PeopleCtx,
  IntelligenceContext, CompanyContext, KnowledgeContext, EngineeringContext,
} from './types';

export function mapToCOOContext(rc: RuntimeContext): COOContext {
  const erp = rc.erpContexts as Record<string, any> | undefined;
  const inventory = erp?.inventory;
  const sales = erp?.sales;
  const production = erp?.production;
  const suppliers = erp?.suppliers;
  const alerts: COOContext["alerts"] = [];

  if (inventory?.health === "critical") {
    alerts.push({ type: "inventory", severity: "critical", message: "Inventory dalam kondisi kritis" });
  }
  if (inventory?.criticalItems?.length > 0) {
    alerts.push({ type: "inventory", severity: "warning", message: `${inventory.criticalItems.length} item perlu restock` });
  }

  return {
    inventory,
    sales,
    production,
    suppliers,
    branches: extractBranches(rc),
    alerts,
    time: rc.time,
  };
}

export function mapToCFOContext(rc: RuntimeContext): CFOContext {
  const erp = rc.erpContexts as Record<string, any> | undefined;
  const fin = erp?.finance;
  const totalRevenue = fin?.revenue?.total ?? fin?.revenueTotal ?? 0;
  const totalExpenses = fin?.expenseTotal ?? 0;
  const totalOrders = fin?.totalOrders ?? 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const grossProfit = fin?.profit?.gross ?? fin?.grossProfit ?? 0;
  const grossMargin = fin?.profit?.margin ?? fin?.grossMargin ?? 0;
  const netProfit = fin?.profit?.net ?? fin?.netProfit ?? 0;
  const cashPosition = fin?.cashPosition?.current ?? fin?.cashPosition ?? 0;
  return {
    finance: {
      ...(fin || {}),
      revenue: totalRevenue,
      totalOrders,
      averageOrderValue: avgOrderValue,
      totalExpenses,
      grossProfit,
      grossMargin,
      netProfit,
      cashPosition,
    },
    sales: erp?.sales,
    branches: extractBranches(rc),
    time: rc.time,
  };
}

export function mapToMarketingContext(rc: RuntimeContext): MarketingContext {
  const erp = rc.erpContexts as Record<string, any> | undefined;
  return {
    sales: erp?.sales,
    products: [],
    branches: extractBranches(rc),
    time: rc.time,
  };
}

export function mapToPeopleContext(rc: RuntimeContext): PeopleCtx {
  const erp = rc.erpContexts as Record<string, any> | undefined;
  return {
    people: erp?.people,
    branches: extractBranches(rc),
    time: rc.time,
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
    time: rc.time,
  };
}

export function mapToCompanyContext(rc: RuntimeContext): CompanyContext {
  const erp = rc.erpContexts as Record<string, any> | undefined;
  const finance = erp?.finance;
  const inventory = erp?.inventory;
  const flags: string[] = [];
  if (finance?.financialHealth?.score < 50) flags.push("Financial health kritis");
  if (inventory?.health === "critical") flags.push("Inventory kritis");
  const healthScore = finance?.financialHealth?.score ?? 70;

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
    time: rc.time,
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
    time: rc.time,
  };
}

export function mapToEngineeringContext(rc: RuntimeContext): EngineeringContext {
  return {
    repository: rc.grounding.repository.map(f => ({ path: f.path, fileCount: 1 })),
    deployment: { status: "unknown", lastDeploy: "N/A", pendingChanges: 0 },
    systemMetrics: { healthScore: rc.runtime.confidence.overall * 100, activeTools: rc.planning.suggestedTools.length, pipelineStatus: rc.metadata.degraded ? "degraded" : "healthy" },
    time: rc.time,
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
  const erp = rc.erpContexts as Record<string, any> | undefined;
  if (erp?.sales?.branches?.length) {
    return erp.sales.branches.map((b: any) => ({ id: b.id, name: b.name, location: b.location }));
  }
  if (erp?.sales?.orders?.length) {
    const branchIds = [...new Set(erp.sales.orders.map((o: any) => o.branchId))].filter(Boolean) as number[];
    if (branchIds.length > 0) {
      return branchIds.map((id: number) => ({ id, name: `Cabang ${id}` }));
    }
  }
  if (erp?.inventory?.warehouseUtilization?.length) {
    return erp.inventory.warehouseUtilization.map((w: any) => ({
      id: w.warehouseId ?? 0,
      name: w.name ?? `Gudang ${w.warehouseId}`,
    }));
  }
  return [{ id: 1, name: "Main Branch" }];
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

export function mapContextForRole(role: string, rc: RuntimeContext): any {
  const mapper = mappers[role];
  if (!mapper) return {};
  return mapper(rc);
}
