import type { Metric, Insight, InsightCategory, InsightSeverity } from "./types";
import { metricStore } from "./MetricStore";

export type InsightGenerator = (metrics: Metric[], branchId?: number) => Insight | null;

const generators = new Map<string, InsightGenerator>();

export function registerInsightGenerator(name: string, generator: InsightGenerator): void {
  generators.set(name, generator);
}

export class InsightEngine {
  run(branchId?: number): Insight[] {
    const results: Insight[] = [];
    const allMetrics = metricStore.getAll(branchId);

    for (const [name, generator] of generators) {
      try {
        const insight = generator(allMetrics, branchId);
        if (insight) results.push(insight);
      } catch (err) {
        console.error(`[InsightEngine] Generator "${name}" failed:`, err);
      }
    }

    return results;
  }

  runForDomain(domain: string, branchId?: number): Insight[] {
    const metrics = metricStore.getByDomain(domain, branchId);
    const results: Insight[] = [];

    for (const [name, generator] of generators) {
      try {
        const insight = generator(metrics, branchId);
        if (insight && insight.domain === domain) results.push(insight);
      } catch (err) {
        console.error(`[InsightEngine] Generator "${name}" failed:`, err);
      }
    }

    return results;
  }
}

export const insightEngine = new InsightEngine();

export function buildInsight(params: {
  category: InsightCategory;
  name: string;
  description: string;
  value: number;
  severity: InsightSeverity;
  sourceMetrics: string[];
  domain: Metric["domain"];
  threshold?: number;
  branchId?: number;
}): Insight {
  return {
    id: `insight-${params.category}-${params.name}-${Date.now()}`,
    category: params.category,
    name: params.name,
    description: params.description,
    value: params.value,
    severity: params.severity,
    sourceMetrics: params.sourceMetrics,
    timestamp: new Date(),
    domain: params.domain,
    branchId: params.branchId,
    threshold: params.threshold,
  };
}
