// SPRINT 3.5: Trace — end-to-end pipeline visualization
import { ExecutionContext } from "./execution-context";
import { logger } from "./logger";
import { recordPipeline } from "./metrics";

/** Finalize a request trace — log report + record metrics */
export function finalize(ctx: ExecutionContext): void {
  recordPipeline(ctx);

  const report = ctx.report();
  logger.info(ctx, "Trace", "request_complete", {
    durationMs: ctx.totalDurationMs,
    steps: ctx.trace.length,
    tools: ctx.tools.length,
    errors: ctx.errors.length,
    metrics: ctx.metrics,
  });

  // Print full trace to console for PM2 logs
  console.log(`\n${ctx.report()}\n`);
}

/** Quick trace for error diagnosis */
export function errorTrace(ctx: ExecutionContext, component: string, error: Error): string {
  ctx.end("error", error.message);
  logger.error(ctx, "Trace", `pipeline_error: ${component}`, error, {
    traceSteps: ctx.trace.length,
    lastStep: ctx.trace[ctx.trace.length - 1]?.component,
  });
  return ctx.report();
}

// Component metadata
export const traceSystem = {
  name: "TraceSystem",
  version: "1.0.0",
  capabilities: ["pipeline-tracing", "error-diagnosis", "report-generation"],
  dependencies: ["ExecutionContext", "MetricsSystem"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
