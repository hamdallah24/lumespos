import { factEngine } from "../core";
import { InsightProvider } from "./InsightProvider";
import type { BusinessFact, FactCategory, FactSeverity, MetricDomain } from "../core/types";

const factCache = new Map<string, { facts: BusinessFact[]; timestamp: number }>();
const CACHE_TTL = 120_000;

export const FactProvider = {
  getAll(branchId?: number, forceRefresh: boolean = false): BusinessFact[] {
    const cacheKey = `facts-${branchId ?? "all"}`;
    const cached = factCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.facts;
    }

    const insights = InsightProvider.getAll(branchId, forceRefresh);
    const facts = factEngine.run(insights, branchId);
    factCache.set(cacheKey, { facts, timestamp: Date.now() });
    return facts;
  },

  getByDomain(domain: MetricDomain, branchId?: number): BusinessFact[] {
    return this.getAll(branchId).filter(f => f.domain === domain);
  },

  getByCategory(category: FactCategory, branchId?: number): BusinessFact[] {
    return this.getAll(branchId).filter(f => f.category === category);
  },

  getBySeverity(severity: FactSeverity, branchId?: number): BusinessFact[] {
    return this.getAll(branchId).filter(f => f.severity === severity);
  },

  getHighSeverity(branchId?: number): BusinessFact[] {
    return this.getAll(branchId).filter(f => f.severity === "high");
  },
};
