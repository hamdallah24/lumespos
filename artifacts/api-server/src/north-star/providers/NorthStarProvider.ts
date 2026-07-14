import { NorthStarConfiguration } from "../NorthStarConfiguration";
import { StrategyEvaluator, type EvaluationResult } from "../StrategyEvaluator";
import { ScoreCalculator } from "../ScoreCalculator";
import { QUARTERLY_PRESETS, getCurrentQuarterKey } from "../QuarterlyPresets";

export const NorthStarProvider = {
  getConfig() {
    return NorthStarConfiguration.get();
  },

  evaluate(values: Record<string, number>): { totalScore: number; maxScore: number; results: EvaluationResult[] } {
    return StrategyEvaluator.evaluate(values);
  },

  calculateScore(values: Record<string, number>): number {
    return ScoreCalculator.evaluate(values);
  },

  compare(options: { name: string; values: Record<string, number> }[]) {
    return ScoreCalculator.compare(options);
  },

  updateObjective(id: string, updates: Record<string, unknown>): boolean {
    return NorthStarConfiguration.updateObjective(id, updates as any);
  },

  applyQuarterlyPreset(quarterKey: string): void {
    const preset = QUARTERLY_PRESETS[quarterKey];
    if (!preset) return;
    NorthStarConfiguration.update({ objectives: preset.objectives as any });
  },

  applyCurrentQuarter(): void {
    const key = getCurrentQuarterKey();
    this.applyQuarterlyPreset(key);
  },

  getCurrentWeights(): Record<string, number> {
    const config = NorthStarConfiguration.get();
    const weights: Record<string, number> = {};
    for (const obj of config.objectives) {
      weights[obj.id] = obj.weight;
    }
    return weights;
  },

  getCurrentPriority(): string[] {
    const config = NorthStarConfiguration.get();
    return config.objectives
      .sort((a, b) => b.weight - a.weight)
      .map((o) => o.id);
  },

  evaluateStrategy(direction: string): { score: number; dimensions: Array<{ name: string; score: number; weight: number }> } {
    const config = NorthStarConfiguration.get();
    const dimensionScores: Record<string, number> = {
      growth: { revenue: 80, margin: 50, coverage: 40, yield: 50, cash: 30, expense: 40, satisfaction: 50 },
      optimization: { revenue: 50, margin: 80, coverage: 70, yield: 70, cash: 60, expense: 70, satisfaction: 60 },
      cost_reduction: { revenue: 30, margin: 70, coverage: 60, yield: 50, cash: 70, expense: 90, satisfaction: 40 },
      quality: { revenue: 40, margin: 40, coverage: 50, yield: 90, cash: 50, expense: 30, satisfaction: 90 },
      risk_mitigation: { revenue: 20, margin: 50, coverage: 80, yield: 60, cash: 80, expense: 60, satisfaction: 60 },
    };
    const scores = dimensionScores[direction] ?? dimensionScores.optimization;

    let totalScore = 0;
    const dimensions: Array<{ name: string; score: number; weight: number }> = [];
    for (const obj of config.objectives) {
      const score = scores[obj.id.split("-")[1]?.toLowerCase()] ?? 50;
      dimensions.push({ name: obj.name, score, weight: obj.weight });
      totalScore += (score * obj.weight) / 100;
    }
    return { score: Math.round(totalScore), dimensions };
  },
};
