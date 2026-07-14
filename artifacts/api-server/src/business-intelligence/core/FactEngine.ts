import type { BusinessFact, Insight, FactCategory, FactSeverity, FactThreshold } from "./types";

export type FactGenerator = (insights: Insight[], branchId?: number) => BusinessFact | null;

const generators = new Map<string, FactGenerator>();

const thresholds = new Map<string, FactThreshold>();

export function registerFactGenerator(name: string, generator: FactGenerator): void {
  generators.set(name, generator);
}

export function registerThreshold(threshold: FactThreshold): void {
  thresholds.set(threshold.factName, threshold);
}

export function getThreshold(factName: string): FactThreshold | undefined {
  return thresholds.get(factName);
}

export class FactEngine {
  run(insights: Insight[], branchId?: number): BusinessFact[] {
    const results: BusinessFact[] = [];

    for (const [name, generator] of generators) {
      try {
        const fact = generator(insights, branchId);
        if (fact) results.push(fact);
      } catch (err) {
        console.error(`[FactEngine] Generator "${name}" failed:`, err);
      }
    }

    return results;
  }
}

export const factEngine = new FactEngine();

export function buildFact(params: {
  category: FactCategory;
  name: string;
  description: string;
  severity: FactSeverity;
  sourceInsights: string[];
  sourceMetrics: string[];
  value: number;
  domain: Insight["domain"];
  threshold?: number;
  deviation?: number;
  branchId?: number;
  expiresAt?: Date;
}): BusinessFact {
  return {
    id: `fact-${params.category}-${params.name}-${Date.now()}`,
    category: params.category,
    name: params.name,
    description: params.description,
    severity: params.severity,
    sourceInsights: params.sourceInsights,
    sourceMetrics: params.sourceMetrics,
    value: params.value,
    domain: params.domain,
    threshold: params.threshold,
    deviation: params.deviation,
    timestamp: new Date(),
    branchId: params.branchId,
    expiresAt: params.expiresAt,
  };
}
