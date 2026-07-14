import { StrategyEvaluator } from "./StrategyEvaluator";
import { NorthStarConfiguration } from "./NorthStarConfiguration";

export const ScoreCalculator = {
  evaluate(values: Record<string, number>): number {
    const { totalScore, maxScore } = StrategyEvaluator.evaluate(values);
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  },

  compare(options: { name: string; values: Record<string, number> }[]): { name: string; score: number; rank: number }[] {
    const scored = options.map(o => ({ name: o.name, score: this.evaluate(o.values) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s, i) => ({ ...s, rank: i + 1 }));
  },

  getWeightedScore(metricId: string, currentValue: number): number {
    const config = NorthStarConfiguration.get();
    const metric = config.objectives.find(o => o.id === metricId);
    if (!metric) return 0;

    let score = 0;
    if (metric.target > 0) {
      const ratio = currentValue / metric.target;
      score = metric.direction === "up" ? Math.min(100, ratio * 100) : Math.min(100, (1 / ratio) * 100);
    }
    score = Math.max(0, Math.min(100, score));
    return (score * metric.weight) / 100;
  },
};
