import { NorthStarConfiguration } from "./NorthStarConfiguration";

export interface EvaluationResult {
  objectiveId: string;
  objectiveName: string;
  weight: number;
  currentValue: number;
  targetValue: number;
  score: number;
  weightedScore: number;
}

export const StrategyEvaluator = {
  evaluate(targetValues: Record<string, number>): { results: EvaluationResult[]; totalScore: number; maxScore: number } {
    const config = NorthStarConfiguration.get();
    const results: EvaluationResult[] = [];

    for (const obj of config.objectives) {
      const currentValue = targetValues[obj.id] ?? 0;
      let score = 0;

      if (obj.target > 0) {
        const ratio = currentValue / obj.target;
        score = obj.direction === "up" ? Math.min(100, ratio * 100) : Math.min(100, (1 / ratio) * 100);
      }

      score = Math.max(0, Math.min(100, score));

      results.push({
        objectiveId: obj.id,
        objectiveName: obj.name,
        weight: obj.weight,
        currentValue,
        targetValue: obj.target,
        score,
        weightedScore: (score * obj.weight) / 100,
      });
    }

    const totalScore = results.reduce((s, r) => s + r.weightedScore, 0);
    const maxScore = results.reduce((s, r) => s + r.weight, 0);

    return { results, totalScore, maxScore };
  },
};
