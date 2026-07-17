import type { TraceStage, Evidence, RuntimeTrace, RuntimeBudget } from './types';

export class PipelineTracer {
  private stages: TraceStage[] = [];
  private evidence: Evidence[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async traceStage<T>(
    name: TraceStage['name'],
    provider: string,
    fn: () => Promise<T>,
    confidence: number,
    model?: string,
  ): Promise<T> {
    const stageStart = Date.now();

    try {
      const result = await fn();
      const durationMs = Date.now() - stageStart;

      this.stages.push({
        name,
        durationMs,
        confidence,
        provider,
        model,
        status: 'success',
      });

      return result;
    } catch (err) {
      const durationMs = Date.now() - stageStart;
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.stages.push({
        name,
        durationMs,
        confidence: 0,
        provider,
        model,
        status: 'failed',
        error: errorMessage,
      });

      throw err;
    }
  }

  addEvidence(entries: Evidence[]): void {
    this.evidence.push(...entries);
  }

  getTrace(): RuntimeTrace {
    return {
      stages: [...this.stages],
      totalDurationMs: Date.now() - this.startTime,
    };
  }

  getEvidence(): Evidence[] {
    return [...this.evidence];
  }

  getTotalDurationMs(): number {
    return Date.now() - this.startTime;
  }

  getBudget(budgetLimits: Record<string, number>): RuntimeBudget {
    const exceededStages: string[] = [];

    for (const stage of this.stages) {
      const limit = budgetLimits[stage.name];
      if (limit !== undefined && stage.durationMs > limit && stage.status !== 'failed') {
        exceededStages.push(stage.name);
      }
    }

    return {
      limits: { ...budgetLimits },
      exceeded: exceededStages.length > 0,
      exceededStages,
    };
  }

  reset(): void {
    this.stages = [];
    this.evidence = [];
    this.startTime = Date.now();
  }
}
