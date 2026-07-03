// ECP-032.5: Trace Manager — generates Trace IDs and manages spans
// Frozen. Every request gets a Trace ID. All events carry the same Trace ID.

import type { TraceSpan, TraceRecord } from "./types";

let _traceCounter = 0;
const _activeTraces = new Map<string, TraceRecord>();
const MAX_TRACES = 500;

export function startTrace(requestId: string, runtime: string, missionId?: string): TraceRecord {
  _traceCounter++;
  const traceId = `trace-${Date.now().toString(36)}-${_traceCounter}`;

  const rootSpan: TraceSpan = {
    id: `span-root-${traceId}`,
    traceId,
    name: `${runtime} Entry`,
    runtime,
    startTime: Date.now(),
    status: "running",
    metadata: {},
    children: [],
  };

  const record: TraceRecord = {
    traceId,
    requestId,
    runtime,
    startedAt: Date.now(),
    rootSpan,
    spans: [rootSpan],
    decisionCount: 0,
    missionId,
  };

  _activeTraces.set(traceId, record);
  if (_activeTraces.size > MAX_TRACES) {
    const first = _activeTraces.keys().next().value;
    if (first) _activeTraces.delete(first);
  }

  return record;
}

export function startSpan(traceId: string, name: string, runtime: string, parentSpanId?: string): TraceSpan | null {
  const trace = _activeTraces.get(traceId);
  if (!trace) return null;

  const span: TraceSpan = {
    id: `span-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    traceId,
    parentSpanId: parentSpanId || trace.rootSpan.id,
    name,
    runtime,
    startTime: Date.now(),
    status: "running",
    metadata: {},
    children: [],
  };

  trace.spans.push(span);
  return span;
}

export function endSpan(span: TraceSpan, status: "completed" | "failed" = "completed", metadata?: Record<string, unknown>): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
  if (metadata) span.metadata = { ...span.metadata, ...metadata };
}

export function completeTrace(traceId: string): void {
  const trace = _activeTraces.get(traceId);
  if (!trace) return;
  trace.completedAt = Date.now();
  trace.rootSpan.endTime = Date.now();
  trace.rootSpan.durationMs = trace.rootSpan.endTime! - trace.rootSpan.startTime;
  trace.rootSpan.status = "completed";
}

export function getTrace(traceId: string): TraceRecord | undefined {
  return _activeTraces.get(traceId);
}

export function getRecentTraces(limit = 10): string[] {
  const entries = [..._activeTraces.entries()];
  return entries.slice(-limit).map(([id]) => id);
}

export function incrementDecisionCount(traceId: string): void {
  const trace = _activeTraces.get(traceId);
  if (trace) trace.decisionCount++;
}

export function setTraceTokens(traceId: string, total: number, layers: { layer: string; used: number }[]): void {
  const trace = _activeTraces.get(traceId);
  if (trace) trace.tokenUsage = { total, layers };
}
