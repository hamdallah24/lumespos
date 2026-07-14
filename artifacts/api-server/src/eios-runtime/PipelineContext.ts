import { PipelineContext } from "./public/PipelineContext";
import type { PipelineTrigger, PipelineStatus } from "./contracts/PipelineContracts";

export function createPipelineContext(correlationId: string, _trigger?: PipelineTrigger, _branchId?: number, _executiveScope?: string[]): PipelineContext {
  return new PipelineContext(correlationId);
}

export { PipelineContext };
