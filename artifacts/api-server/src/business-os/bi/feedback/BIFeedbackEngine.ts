import { DecisionOutcomeTracker } from "./DecisionOutcomeTracker";
import { OutcomeRecorder } from "./OutcomeRecorder";
import { OutcomeEvaluator } from "./OutcomeEvaluator";
import { ForecastAccuracy } from "./ForecastAccuracy";
import { RecommendationEffectiveness } from "./RecommendationEffectiveness";
import { StrategyEvaluator } from "./StrategyEvaluator";
import { ExecutivePerformance } from "./ExecutivePerformance";
import { ConfidenceCalibration } from "./ConfidenceCalibration";
import { ExecutiveLearning } from "./ExecutiveLearning";
import type { BIFeedback, DecisionOutcome } from "./DecisionOutcome";

export class BIFeedbackEngine {
  public tracker: DecisionOutcomeTracker;
  public recorder: OutcomeRecorder;
  public evaluator: OutcomeEvaluator;
  public forecastAcc: ForecastAccuracy;
  public recommendationEff: RecommendationEffectiveness;
  public strategyEval: StrategyEvaluator;
  public performance: ExecutivePerformance;
  public calibration: ConfidenceCalibration;
  public learning: ExecutiveLearning;

  private memoryAdapter: {
    recordEpisodic?: (entry: any) => void;
    learnSemantic?: (pattern: any) => void;
    recordStrategy?: (entry: any) => void;
  } = {};

  constructor() {
    this.tracker = new DecisionOutcomeTracker();
    this.recorder = new OutcomeRecorder(this.tracker);
    this.evaluator = new OutcomeEvaluator();
    this.forecastAcc = new ForecastAccuracy();
    this.recommendationEff = new RecommendationEffectiveness();
    this.strategyEval = new StrategyEvaluator();
    this.calibration = new ConfidenceCalibration();
    this.performance = new ExecutivePerformance(this.tracker, this.forecastAcc, this.strategyEval);
    this.learning = new ExecutiveLearning(this.tracker, this.calibration, this.strategyEval);
  }

  setMemoryAdapter(adapter: { recordEpisodic?: (entry: any) => void; learnSemantic?: (pattern: any) => void; recordStrategy?: (entry: any) => void }): void {
    this.memoryAdapter = adapter;
  }

  processDecision(
    decision: { decisionId: string; executive: string; action: string; reasoning: string; confidence: number; parameters: Record<string, any> },
    execution: { executionId: string; success: boolean; message: string; durationMs: number },
    erpResult?: { before: Record<string, number>; after: Record<string, number> },
    businessResult?: { actualValue: number; expectedValue: number },
  ): DecisionOutcome {
    const outcome = this.recorder.record(decision, execution, erpResult, businessResult);
    const evaluated = this.recorder.evaluateAndUpdate(outcome, this.evaluator);

    this.calibration.calibrate(decision.decisionId, decision.executive, decision.confidence, evaluated.status);
    this.strategyEval.record(decision.action, decision.executive, decision.action, evaluated.status, evaluated.score, 0);

    this.syncToMemory(evaluated, decision);

    return evaluated;
  }

  processOutcome(outcome: DecisionOutcome): void {
    const evaluated = this.recorder.evaluateAndUpdate(outcome, this.evaluator);
    this.calibration.calibrate(outcome.decisionId, outcome.executive, outcome.score / 100, evaluated.status);
  }

  getFeedback(): BIFeedback {
    const calibMap = new Map<string, number>();
    for (const exec of ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"]) {
      calibMap.set(exec, this.calibration.getMultiplier(exec));
    }

    return {
      outcomes: this.tracker.getAll(),
      forecastAccuracy: this.forecastAcc.getRecentResults(),
      recommendations: this.recommendationEff.getRankedByEffectiveness(),
      strategies: this.strategyEval.evaluateAll(),
      executivePerformance: this.performance.calculateAll(calibMap),
      calibrations: ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"].flatMap(e => this.calibration.getHistory(e)),
      learningProfiles: ["CEO", "COO", "CFO", "CMO", "CHRO", "CTO", "CAIO", "CKO"].map(e => this.learning.generateProfile(e)),
      lastUpdated: Date.now(),
    };
  }

  getFounderFeedbackSummary(): {
    executiveAccuracy: { executive: string; successRate: number; avgConfidence: number; trend: string }[];
    forecastAccuracy: number;
    bestStrategy: string;
    worstStrategy: string;
    topFailurePattern: string;
    topSuccessPattern: string;
    recommendationScore: number;
  } {
    const feedback = this.getFeedback();
    const executiveAccuracy = feedback.executivePerformance.map(p => ({
      executive: p.executive,
      successRate: p.successRate,
      avgConfidence: p.avgConfidence,
      trend: p.trend,
    }));
    const forecastAccuracy = feedback.forecastAccuracy.length > 0
      ? feedback.forecastAccuracy.reduce((s, f) => s + f.accuracy, 0) / feedback.forecastAccuracy.length
      : 0;
    const allStrategies = feedback.strategies;
    const bestStrategy = allStrategies.sort((a, b) => b.successRate - a.successRate)[0]?.strategy ?? "-";
    const worstStrategy = allStrategies.sort((a, b) => a.successRate - b.successRate)[0]?.strategy ?? "-";
    const allFailures = feedback.learningProfiles.flatMap(p => p.failurePatterns).sort((a, b) => b.count - a.count);
    const allSuccesses = feedback.learningProfiles.flatMap(p => p.successPatterns).sort((a, b) => b.count - a.count);
    const topFailurePattern = allFailures[0]?.pattern ?? "-";
    const topSuccessPattern = allSuccesses[0]?.pattern ?? "-";
    const recommendationScore = feedback.recommendations.length > 0
      ? feedback.recommendations.reduce((s, r) => s + r.successRate, 0) / feedback.recommendations.length
      : 0;

    return { executiveAccuracy, forecastAccuracy, bestStrategy, worstStrategy, topFailurePattern, topSuccessPattern, recommendationScore: Math.round(recommendationScore * 100) / 100 };
  }

  private syncToMemory(outcome: DecisionOutcome, decision: { executive: string; action: string; reasoning: string }): void {
    if (outcome.status === "SUCCESS" && this.memoryAdapter.recordStrategy) {
      this.memoryAdapter.recordStrategy({
        executive: outcome.executive,
        title: `Strategy: ${decision.action}`,
        description: `Successful outcome: ${outcome.reason}`,
        objective: outcome.objective,
        actions: [decision.action],
        outcome: "success",
        confidence: outcome.score / 100,
        metrics: { deviation: outcome.deviation, score: outcome.score },
        lessonsLearned: [],
        tags: [outcome.executive, decision.action, "feedback_auto"],
      });
    }

    if (this.memoryAdapter.recordEpisodic) {
      this.memoryAdapter.recordEpisodic({
        executive: outcome.executive,
        type: "execution",
        title: decision.action,
        description: `${outcome.reason} (deviation: ${(outcome.deviation * 100).toFixed(0)}%)`,
        outcome: outcome.status === "SUCCESS" ? "success" : outcome.status === "FAILED" ? "failure" : "pending",
        confidence: outcome.score / 100,
        context: { decisionId: outcome.decisionId, executionId: outcome.executionId, deviation: outcome.deviation },
        tags: [outcome.executive, decision.action, "feedback"],
      });
    }

    if (outcome.status === "FAILED" && this.memoryAdapter.learnSemantic) {
      this.memoryAdapter.learnSemantic({
        type: "threshold",
        description: `${outcome.executive} has recurring failures on ${decision.action} — consider alternative approach`,
        confidence: Math.max(0.3, 1 - (1 / Math.max(1, this.tracker.getByExecutive(outcome.executive).filter(o => o.status === "FAILED").length))),
        evidence: [decision.action],
        lastConfirmed: new Date().toISOString(),
        hitCount: this.tracker.getByExecutive(outcome.executive).filter(o => o.status === "FAILED").length,
      });
    }
  }
}
