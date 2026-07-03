// ECP-032.5: Telemetry API — unified observability interface
// Frozen. All Runtimes call this, not individual publishers.

import { startTrace, startSpan, endSpan, completeTrace, incrementDecisionCount, getTrace } from "./trace-manager";
import type { TraceSpan, TraceRecord } from "./types";
import { eventBus } from "./event-bus";

interface SpanOpts {
  traceId: string;
  name: string;
  runtime: string;
  parentSpanId?: string;
}

class Telemetry {
  /** Begin a new request trace */
  begin(requestId: string, runtime: string, missionId?: string): TraceRecord {
    const trace = startTrace(requestId, runtime, missionId);
    eventBus.publish({ type: "trace_started", payload: { traceId: trace.traceId, runtime, missionId } });
    return trace;
  }

  /** Start a span within a trace */
  beginSpan(opts: SpanOpts): TraceSpan | null {
    return startSpan(opts.traceId, opts.name, opts.runtime, opts.parentSpanId);
  }

  /** End a span */
  finishSpan(span: TraceSpan, status: "completed" | "failed" = "completed", metadata?: Record<string, unknown>): void {
    endSpan(span, status, metadata);
    eventBus.publish({ type: "span_completed", payload: { spanId: span.id, traceId: span.traceId, name: span.name, status, durationMs: span.durationMs } });
  }

  /** Complete a trace */
  finish(traceId: string): void {
    completeTrace(traceId);
    const trace = getTrace(traceId);
    eventBus.publish({ type: "trace_completed", payload: { traceId, runtime: trace?.runtime, durationMs: trace?.rootSpan.durationMs } });
  }

  /** Record a decision within a trace */
  recordDecision(traceId: string, description: string): void {
    incrementDecisionCount(traceId);
    eventBus.publish({ type: "decision_made", payload: { traceId, description } });
  }

  /** Log a runtime event */
  log(runtime: string, event: string, detail: string, traceId?: string): void {
    eventBus.publish({ type: "runtime_event", payload: { runtime, event, detail, traceId, timestamp: Date.now() } });
  }
}

export const telemetry = new Telemetry();
