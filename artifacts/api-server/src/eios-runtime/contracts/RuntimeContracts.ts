import type { ExecutionResult } from "./PipelineContracts";
import type { PipelineContext } from "./PipelineContracts";
import type { ComponentId } from "./ComponentId";

export interface RuntimeFacade {
  execute(intent: string, payload?: unknown): Promise<ExecutionResult>;
  subscribe(event: string, handler: Function): void;
  capability(id: string): boolean;
  emit(event: string, payload: unknown): void;
  context(): PipelineContext;
  schedule(intervalMs: number, profileId?: string): string;
  unschedule(taskId: string): boolean;
  registry(): { list: () => string[]; has: (id: string) => boolean };
  health(): Promise<{ status: string; score: number }>;
  metrics(): Record<string, number>;
  trace(operation: string): { spanId: string; end: (status: string) => void };
  snapshot(): Promise<Record<string, unknown>>;
  shutdown(): Promise<void>;
}
