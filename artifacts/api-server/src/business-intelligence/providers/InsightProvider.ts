import { insightEngine } from "../core";
import type { Insight, InsightCategory, MetricDomain } from "../core/types";

const insightCache = new Map<string, { insights: Insight[]; timestamp: number }>();
const CACHE_TTL = 60_000;

export const InsightProvider = {
  getAll(branchId?: number, forceRefresh: boolean = false): Insight[] {
    const cacheKey = `all-${branchId ?? "all"}`;
    const cached = insightCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.insights;
    }
    const insights = insightEngine.run(branchId);
    insightCache.set(cacheKey, { insights, timestamp: Date.now() });
    return insights;
  },

  getByDomain(domain: MetricDomain, branchId?: number): Insight[] {
    return this.getAll(branchId).filter(i => i.domain === domain);
  },

  getByCategory(category: InsightCategory, branchId?: number): Insight[] {
    return this.getAll(branchId).filter(i => i.category === category);
  },

  getCritical(branchId?: number): Insight[] {
    return this.getAll(branchId).filter(i => i.severity === "critical");
  },
};
