import { metricStore } from "../core";
import type { Metric, MetricDomain, MetricPeriod } from "../core/types";

export const MetricProvider = {
  getByDomain(domain: MetricDomain, branchId?: number): Metric[] {
    return metricStore.getByDomain(domain, branchId);
  },

  getByName(name: string, branchId?: number): Metric[] {
    return metricStore.getByName(name, branchId);
  },

  getLatest(name: string, branchId?: number): Metric | undefined {
    return metricStore.getLatest(name, branchId);
  },

  getAll(branchId?: number): Metric[] {
    return metricStore.getAll(branchId);
  },

  getSummary(branchId?: number): Record<string, number> {
    const metrics = metricStore.getAll(branchId);
    const summary: Record<string, number> = {};
    for (const m of metrics) {
      const key = `${m.domain}.${m.name}`;
      summary[key] = m.value;
    }
    return summary;
  },

  getByDomainAndPeriod(domain: MetricDomain, period: MetricPeriod, branchId?: number): Metric[] {
    return metricStore.getAll(branchId).filter(m =>
      m.domain === domain && m.period === period,
    );
  },
};
