import type { OperationalSituation } from "../operational-decision-engine/core/types";
import type { DecisionContext } from "../decision-context/types";
import type { SimulationResult, ComparisonReport, SensitivityReport, ForecastResult } from "./types";
import { runSimulation } from "./StrategySimulator";
import { compareSimulations } from "./StrategyComparator";
import { analyzeSensitivity } from "./SensitivityAnalyzer";
import { forecastOutcomes } from "./ForecastEngine";

interface CacheEntry {
  results: SimulationResult[];
  timestamp: number;
}

const resultCache = new Map<string, CacheEntry>();
const MAX_CACHE = 50;

function cacheKey(situationId: string, contextId?: string): string {
  return `${situationId}::${contextId ?? "none"}`;
}

export const StrategySimulatorProvider = {
  simulate(
    situation: OperationalSituation,
    context?: DecisionContext,
  ): SimulationResult[] {
    const key = cacheKey(situation.id, context?.id);

    if (resultCache.has(key)) {
      const entry = resultCache.get(key)!;
      if (Date.now() - entry.timestamp < 60000) {
        return entry.results;
      }
    }

    const results = runSimulation(situation, context);

    if (resultCache.size >= MAX_CACHE) {
      const firstKey = resultCache.keys().next().value;
      if (firstKey) resultCache.delete(firstKey);
    }
    resultCache.set(key, { results, timestamp: Date.now() });

    return results;
  },

  compare(results: SimulationResult[]): ComparisonReport {
    return compareSimulations(results);
  },

  sensitivity(situation: OperationalSituation): SensitivityReport {
    return analyzeSensitivity(situation);
  },

  forecast(objective: Parameters<typeof forecastOutcomes>[0]): ForecastResult {
    return forecastOutcomes(objective);
  },

  clearCache(): void {
    resultCache.clear();
  },
};
