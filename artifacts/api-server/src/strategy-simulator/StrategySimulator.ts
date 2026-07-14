import type { OperationalSituation } from "../operational-decision-engine/core/types";
import type { DecisionContext } from "../decision-context/types";
import type { SimulationResult, SimulationVariant } from "./types";
import { buildStrategy, evaluateOption } from "../strategy-engine/core";
import { buildVariants, variantToPartialContext } from "./ScenarioBuilder";
import { generateOptions } from "../strategy-engine/core/OptionGenerator";
import { setKPITargets } from "../strategy-engine/core/ObjectiveSetter";

export function runSimulation(
  situation: OperationalSituation,
  context?: DecisionContext,
): SimulationResult[] {
  const variants = buildVariants(situation, context);
  return variants.map((v) => runSingleVariant(situation, v));
}

export function runSingleVariant(
  situation: OperationalSituation,
  variant: SimulationVariant,
): SimulationResult {
  const start = Date.now();
  try {
    const partialCtx = variantToPartialContext(variant, situation);
    const ctx: DecisionContext = {
      ...partialCtx as DecisionContext,
    };

    const options = generateOptions(situation);
    const matchedOption = options.find((o) => o.direction === variant.direction);

    let objective;
    let northStarAlignment;

    if (matchedOption) {
      northStarAlignment = evaluateOption(matchedOption);
      const kpis = setKPITargets(situation.domain, variant.direction);

      objective = {
        id: `sim-${situation.domain}-${variant.direction}-${Date.now()}`,
        title: `[SIM] ${variant.label}`,
        description: `Simulasi: ${variant.label} untuk ${situation.title}`,
        direction: variant.direction,
        domain: situation.domain,
        sourceSituationId: situation.id,
        kpiTargets: kpis,
        northStarAlignment,
        confidence: computeSimConfidence(variant),
        status: "draft" as const,
        createdAt: new Date(),
        branchId: situation.branchId,
      };
    } else {
      objective = buildStrategy(situation, ctx);
      northStarAlignment = objective.northStarAlignment;
    }

    return {
      configId: variant.id,
      label: variant.label,
      direction: variant.direction,
      objective,
      northStarAlignment,
      confidence: objective.confidence,
      status: "completed",
      durationMs: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      configId: variant.id,
      label: variant.label,
      direction: variant.direction,
      objective: undefined as never,
      northStarAlignment: { overallScore: 0, dimensions: [], summary: "Simulasi gagal" },
      confidence: 0,
      status: "failed",
      durationMs: Date.now() - start,
      error: String(e),
    };
  }
}

function computeSimConfidence(variant: SimulationVariant): number {
  let conf = 70;
  if (variant.riskTolerance === "low") conf += 10;
  if (variant.riskTolerance === "high") conf -= 5;
  if (variant.currentOperationalRisk > 0.7) conf *= 0.85;
  if (variant.cashAvailable < 1000000) conf *= 0.9;
  return Math.round(conf * 100) / 100;
}
