import { PipelineEngine } from "./internal/PipelineEngine";
import { PipelineContext } from "./public/PipelineContext";

export async function executePipeline(_ctx: PipelineContext): Promise<{ context: PipelineContext; executedStages: string[]; durationMs: number }> {
  const start = Date.now();
  const result = await PipelineEngine.execute("default", _ctx);
  return { context: _ctx, executedStages: [], durationMs: Date.now() - start };
}
