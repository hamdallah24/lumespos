import { EpisodicMemory } from "./EpisodicMemory";
import { FailureMemory } from "./FailureMemory";
import { StrategyMemory } from "./StrategyMemory";

export interface ExecutiveExperience {
  executive: string;
  totalActions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgConfidence: number;
  strategiesCreated: number;
  repeatedFailures: number;
  experienceScore: number;
  confidenceMultiplier: number;
  domain: string;
}

const EXECUTIVE_DOMAINS: Record<string, string> = {
  CEO: "strategy", COO: "operations", CFO: "finance", CMO: "marketing",
  CHRO: "people", CTO: "technology", CAIO: "intelligence", CKO: "knowledge",
};

export class ExperienceRanking {
  private scores: Map<string, ExecutiveExperience> = new Map();
  private episodic: EpisodicMemory;
  private failure: FailureMemory;
  private strategy: StrategyMemory;

  constructor(episodic: EpisodicMemory, failure: FailureMemory, strategy: StrategyMemory) {
    this.episodic = episodic;
    this.failure = failure;
    this.strategy = strategy;
  }

  recalculate(executive: string): ExecutiveExperience {
    const episodes = this.episodic.recall({ executive });
    const successes = episodes.filter(e => e.outcome === "success");
    const failures = episodes.filter(e => e.outcome === "failure");
    const totalActions = episodes.length;
    const successCount = successes.length;
    const failureCount = failures.length;
    const successRate = totalActions > 0 ? successCount / totalActions : 0;

    const avgConfidence = episodes.length > 0
      ? episodes.reduce((s, e) => s + e.confidence, 0) / episodes.length
      : 0;

    const strategies = this.strategy.getByExecutive(executive);
    const repeatedFailures = this.failure.getRepeatedFailures(executive).length;

    const baseScore = successRate * 100;
    const confidenceBonus = avgConfidence * 20;
    const strategyBonus = Math.min(strategies.length * 5, 25);
    const repeatPenalty = repeatedFailures * 10;
    const experienceScore = Math.max(0, Math.min(100, baseScore + confidenceBonus + strategyBonus - repeatPenalty));

    const confidenceMultiplier = Math.max(0.5, Math.min(2.0, 0.5 + (experienceScore / 100)));

    const experience: ExecutiveExperience = {
      executive,
      totalActions,
      successCount,
      failureCount,
      successRate: Math.round(successRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      strategiesCreated: strategies.length,
      repeatedFailures,
      experienceScore: Math.round(experienceScore),
      confidenceMultiplier: Math.round(confidenceMultiplier * 100) / 100,
      domain: EXECUTIVE_DOMAINS[executive] ?? "general",
    };

    this.scores.set(executive, experience);
    return experience;
  }

  recalculateAll(): ExecutiveExperience[] {
    const executives = ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"];
    return executives.map(exec => this.recalculate(exec));
  }

  getScore(executive: string): ExecutiveExperience | undefined {
    return this.scores.get(executive);
  }

  getAllScores(): ExecutiveExperience[] {
    return [...this.scores.values()].sort((a, b) => b.experienceScore - a.experienceScore);
  }

  getRanking(): ExecutiveExperience[] {
    return this.getAllScores();
  }

  getConfidenceMultiplier(executive: string): number {
    return this.scores.get(executive)?.confidenceMultiplier ?? 1.0;
  }

  printLeaderboard(): string {
    const sorted = this.getRanking();
    const lines: string[] = [];
    lines.push("Executive Experience Ranking");
    lines.push("─".repeat(60));
    lines.push("Rank  Executive    Score  Rate  Conf  Strat  Domain");
    lines.push("─".repeat(60));
    sorted.forEach((e, i) => {
      lines.push(
        `#${(i + 1).toString().padStart(2)}   ${e.executive.padEnd(8)}  ` +
        `${String(e.experienceScore).padStart(4)}  ` +
        `${(e.successRate * 100).toFixed(0).padStart(3)}%  ` +
        `${(e.avgConfidence * 100).toFixed(0).padStart(3)}%  ` +
        `${String(e.strategiesCreated).padStart(4)}  ${e.domain.padEnd(12)}`
      );
    });
    lines.push("─".repeat(60));
    return lines.join("\n");
  }
}
