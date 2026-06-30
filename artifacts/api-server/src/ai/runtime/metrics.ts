// SPRINT 3.5: Metrics Collector — pipeline & tool performance tracking
import { ExecutionContext } from "./execution-context";
import { logger } from "./logger";

interface PipelineMetric {
  requestId: string;
  totalDurationMs: number;
  userId: number;
  mode: string;
  roundCount: number;
  tokenCount: number;
  toolCount: number;
  toolNames: string[];
  errorCount: number;
  status: "ok" | "error";
  timestamp: string;
}

interface ToolMetric {
  name: string;
  count: number;
  totalDurationMs: number;
  avgDurationMs: number;
  errors: number;
  lastUsed: string;
}

// In-memory metrics store
const pipelineMetrics: PipelineMetric[] = [];
const toolMetrics = new Map<string, ToolMetric>();
const MAX_METRICS = 500;

/** Record pipeline metrics from an ExecutionContext */
export function recordPipeline(ctx: ExecutionContext): void {
  const metric: PipelineMetric = {
    requestId: ctx.requestId,
    totalDurationMs: ctx.totalDurationMs,
    userId: ctx.userId,
    mode: ctx.mode,
    roundCount: ctx.metrics?.roundCount || 0,
    tokenCount: ctx.metrics?.tokenCount || 0,
    toolCount: ctx.tools.length,
    toolNames: ctx.tools.map(t => t.name),
    errorCount: ctx.errors.length,
    status: ctx.errors.length > 0 ? "error" : "ok",
    timestamp: new Date().toISOString(),
  };

  pipelineMetrics.push(metric);
  if (pipelineMetrics.length > MAX_METRICS) pipelineMetrics.shift();

  // Update tool metrics
  for (const t of ctx.tools) {
    const existing = toolMetrics.get(t.name) || { name: t.name, count: 0, totalDurationMs: 0, avgDurationMs: 0, errors: 0, lastUsed: "" };
    existing.count++;
    existing.totalDurationMs += t.durationMs;
    existing.avgDurationMs = existing.totalDurationMs / existing.count;
    if (t.status === "error") existing.errors++;
    existing.lastUsed = new Date().toISOString();
    toolMetrics.set(t.name, existing);
  }

  logger.info(ctx, "Metrics", "pipeline_recorded", {
    durationMs: metric.totalDurationMs,
    rounds: metric.roundCount,
    tools: metric.toolCount,
    status: metric.status,
  });
}

/** Get pipeline summary */
export function pipelineSummary(limit = 20) {
  const recent = pipelineMetrics.slice(-limit);
  if (recent.length === 0) return "No metrics recorded yet.";

  const avgDuration = recent.reduce((s, m) => s + m.totalDurationMs, 0) / recent.length;
  const errorRate = recent.filter(m => m.status === "error").length / recent.length * 100;
  const totalTools = recent.reduce((s, m) => s + m.toolCount, 0);

  return [
    `Pipeline (last ${recent.length} requests):`,
    `  Avg duration: ${Math.round(avgDuration)}ms`,
    `  Error rate: ${errorRate.toFixed(1)}%`,
    `  Total tools called: ${totalTools}`,
    `  Modes: ${[...new Set(recent.map(m => m.mode))].join(", ")}`,
  ].join("\n");
}

/** Get tool performance report */
export function toolReport(limit = 15) {
  const tools = [...toolMetrics.values()]
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
    .slice(0, limit);

  if (tools.length === 0) return "No tool metrics yet.";

  const lines = [`Tools (${tools.length} tracked):`];
  for (const t of tools) {
    const errStr = t.errors > 0 ? ` (${t.errors} errors)` : "";
    lines.push(`  ${t.name}: ${t.count}x, avg ${Math.round(t.avgDurationMs)}ms, total ${t.totalDurationMs}ms${errStr}`);
  }
  return lines.join("\n");
}

/** Export all metrics (for dashboard) */
export function exportMetrics() {
  return {
    pipeline: pipelineMetrics.slice(-100),
    tools: [...toolMetrics.values()],
  };
}

// Component metadata
export const metricsSystem = {
  name: "MetricsSystem",
  version: "1.0.0",
  capabilities: ["pipeline-metrics", "tool-metrics", "performance-tracking"],
  dependencies: ["ExecutionContext"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
