import type { ContextDelta, PipelineContext as PipelineContextContract, PipelineTrigger, PipelineStatus } from "../contracts/PipelineContracts";
import type { ComponentId } from "../contracts/ComponentId";

export class PipelineContext implements PipelineContextContract {
  private _state: Record<string, unknown> = {};
  private readonly _deltaHistory: ContextDelta[] = [];
  readonly traceId: string;
  readonly stageId: ComponentId | null = null;
  readonly executionState: Readonly<Record<string, unknown>> = this._state;
  branchId?: number;
  executiveScope?: string[];
  sourceTrigger?: PipelineTrigger;
  startedAt?: string;
  completedAt?: string;
  status?: PipelineStatus;

  constructor(readonly correlationId: string) {
    this.traceId = correlationId;
  }

  read<T>(key: string): T | undefined {
    return this._state[key] as T;
  }

  apply(delta: ContextDelta): void {
    if (delta.correlationId && delta.correlationId !== this.correlationId) {
      throw new Error("Delta correlationId mismatch");
    }
    for (const key of Object.keys(delta.patches)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new Error(`Blocked prototype key: ${key}`);
      }
    }
    this._state = { ...this._state, ...delta.patches };
    this._deltaHistory.push(delta);
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return { ...this._state };
  }

  getHistory(): ReadonlyArray<ContextDelta> {
    return [...this._deltaHistory];
  }

  static fromDeltas(correlationId: string, deltas: ContextDelta[]): PipelineContext {
    const ctx = new PipelineContext(correlationId);
    for (const d of deltas) ctx.apply(d);
    return ctx;
  }
}
