import type { InventoryContext, FinancialContext, PeopleContext, SupplierContext, ProductionContext, SalesContext } from '../ric/context-builders/types';
import type { ExecutiveDecision } from '../erp-execution/types';
import type { BusinessTimeContext } from '../business-os/temporal/BusinessTimeContext';

export interface ExecutiveTimeContext {
  time: BusinessTimeContext;
}

export interface COOContext extends ExecutiveTimeContext {
  inventory: InventoryContext;
  sales: SalesContext;
  production: ProductionContext;
  suppliers: SupplierContext;
  branches: { id: number; name: string; location?: string }[];
  alerts: { type: string; severity: string; message: string }[];
}

export interface CFOContext extends ExecutiveTimeContext {
  finance: FinancialContext;
  sales: SalesContext;
  branches: { id: number; name: string; location?: string }[];
}

export interface MarketingContext extends ExecutiveTimeContext {
  sales: SalesContext;
  products: { id: number; name: string; price: number; isActive: boolean }[];
  branches: { id: number; name: string; location?: string }[];
}

export interface PeopleContext extends ExecutiveTimeContext {
  people: import('../ric/context-builders/types').PeopleContext;
  branches: { id: number; name: string; location?: string }[];
}

export interface IntelligenceContext extends ExecutiveTimeContext {
  knowledgeStats: { total: number; semantic: number; episode: number; procedural: number };
  systemHealth: { status: string; uptime: number; activeMissions: number };
  platformMetrics: { totalRequests: number; avgConfidence: number; degradedRate: number };
}

export interface CompanyContext extends ExecutiveTimeContext {
  companyHealth: { score: number; flags: string[]; trend: string };
  risks: { type: string; severity: string; description: string }[];
  pendingApprovals: { id: string; action: string; requester: string; value: number; createdAt: string }[];
  operational: { revenue: number; profit: number; cashPosition: number };
  activeMissions: { id: string; name: string; status: string; progress: number }[];
}

export interface KnowledgeContext extends ExecutiveTimeContext {
  knowledge: { total: number; byDomain: { domain: string; count: number }[]; topTopics: string[] };
  learning: { totalOutcomes: number; successRate: number; lastMaintenance: string };
  memory: { totalEntries: number; workingSize: number; organizationalSize: number };
}

export interface EngineeringContext extends ExecutiveTimeContext {
  repository: { path: string; fileCount: number }[];
  deployment: { status: string; lastDeploy: string; pendingChanges: number };
  systemMetrics: { healthScore: number; activeTools: number; pipelineStatus: string };
}
