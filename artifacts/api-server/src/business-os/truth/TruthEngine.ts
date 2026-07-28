import type { RuntimeContext } from '../../runtime-intelligence-core/types';
import { TruthValidator, type ValidationResult } from './TruthValidator';
import { TruthTracer } from './TruthTracer';
import { computeScore, type TruthScoreResult } from './TruthScore';
import { repairWithRetry, type RepairResult } from './TruthRepair';
import { getTruthAudit } from './TruthAudit';
import type { TruthMismatch } from './TruthMismatch';

export interface TruthEngineResult {
  valid: boolean;
  text: string;
  validation: ValidationResult;
  score: TruthScoreResult;
  repair: RepairResult | null;
  originalText: string;
}

export class TruthEngine {
  private validator = new TruthValidator();
  private tracer = new TruthTracer();
  private audit = getTruthAudit();

  validate(
    text: string,
    ctx: RuntimeContext,
    executive: string,
    query?: string,
  ): TruthEngineResult {
    const validation = this.validator.validate(text, ctx, executive);
    const score = computeScore(executive, validation.errors, ctx.time?.label || 'unknown');

    this.audit.record(executive, validation.errors, score.score, ctx.time?.label || 'unknown', query);

    return {
      valid: validation.valid,
      text,
      validation,
      score,
      repair: null,
      originalText: text,
    };
  }

  async validateWithRepair(
    text: string,
    ctx: RuntimeContext,
    executive: string,
    query: string,
    llmReason: (prompt: string) => Promise<{ content: string }>,
  ): Promise<TruthEngineResult> {
    const firstPass = this.validator.validate(text, ctx, executive);
    const firstScore = computeScore(executive, firstPass.errors, ctx.time?.label || 'unknown');
    this.audit.record(executive, firstPass.errors, firstScore.score, ctx.time?.label || 'unknown', query);

    if (firstPass.valid) {
      return {
        valid: true,
        text,
        validation: firstPass,
        score: firstScore,
        repair: null,
        originalText: text,
      };
    }

    const repairResult = await repairWithRetry(
      query,
      text,
      ctx,
      executive,
      this.validator,
      llmReason,
    );

    const finalScore = repairResult.finalValidation
      ? computeScore(executive, repairResult.finalValidation.errors, ctx.time?.label || 'unknown')
      : firstScore;

    return {
      valid: repairResult.success,
      text: repairResult.text,
      validation: repairResult.finalValidation || firstPass,
      score: finalScore,
      repair: repairResult,
      originalText: text,
    };
  }

  getScoreHistory(executive: string, limit = 20) {
    return this.audit.getScoreHistory(executive, limit);
  }

  getFailurePatterns() {
    return this.audit.getFailurePatterns();
  }

  getMostHallucinated() {
    return this.audit.getMostHallucinatedExecutives();
  }

  getRecentAudit(limit = 50) {
    return this.audit.getRecent(limit);
  }
}

let instance: TruthEngine | null = null;
export function getTruthEngine(): TruthEngine {
  if (!instance) instance = new TruthEngine();
  return instance;
}
