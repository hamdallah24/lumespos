import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { DecisionContext } from "../../decision-context/types";
import type { StrategicObjective, StrategicOption } from "./types";
import { generateOptions } from "./OptionGenerator";
import { alignWithNorthStar } from "./NorthStarAligner";
import { setKPITargets } from "./ObjectiveSetter";

export function buildStrategy(
  situation: OperationalSituation,
  context?: DecisionContext,
): StrategicObjective {
  let options = generateOptions(situation);

  if (context) {
    options = filterOptionsByContext(options, context);
  }

  const scored = options.map((opt) => {
    const ns = alignWithNorthStar(opt.direction);
    return { option: opt, northStar: ns, score: ns.overallScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  const kpis = setKPITargets(situation.domain, best.option.direction);

  return {
    id: `strategy-${situation.domain}-${Date.now()}`,
    title: best.option.title,
    description: best.option.description,
    direction: best.option.direction,
    domain: situation.domain,
    sourceSituationId: situation.id,
    kpiTargets: kpis,
    northStarAlignment: best.northStar,
    confidence: adjustConfidenceByContext(best.option.confidence, context),
    status: "draft",
    createdAt: new Date(),
    branchId: situation.branchId,
  };
}

function filterOptionsByContext(
  options: StrategicOption[],
  context: DecisionContext,
): StrategicOption[] {
  let filtered = [...options];
  if (context.riskProfile.riskTolerance === "low") {
    filtered = filtered.filter((o) => o.risks.length === 0);
  }
  if (context.resources.availableBudget < 1000000) {
    filtered = filtered.filter((o) => o.direction !== "growth");
  }
  return filtered.length > 0 ? filtered : options;
}

function adjustConfidenceByContext(
  baseConfidence: number,
  context?: DecisionContext,
): number {
  if (!context) return baseConfidence;
  let adjusted = baseConfidence;
  if (context.riskProfile.currentOperationalRisk > 0.7) {
    adjusted *= 0.85;
  }
  if (context.businessState.cashAvailable < 1000000) {
    adjusted *= 0.9;
  }
  return Math.round(adjusted * 100) / 100;
}

export function evaluateOption(option: StrategicOption) {
  return alignWithNorthStar(option.direction);
}
