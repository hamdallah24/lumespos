import type { DecisionContext } from "./types";
import { collectBusinessState } from "./BusinessStateCollector";
import { analyzeResources } from "./ResourceAnalyzer";
import { buildStrategicContext } from "./StrategicContextBuilder";
import { buildOperationalContext } from "./OperationalContextBuilder";
import { analyzeRiskProfile } from "./RiskProfileAnalyzer";

export function buildDecisionContext(): DecisionContext {
  return {
    id: `ctx-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    businessState: collectBusinessState(),
    resources: analyzeResources(),
    strategicContext: buildStrategicContext(),
    operationalContext: buildOperationalContext(),
    riskProfile: analyzeRiskProfile(),
  };
}
