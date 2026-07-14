let traceCounter = 0;

function nextId(): string {
  traceCounter++;
  return `${Date.now().toString(36)}-${traceCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

interface Span {
  spanId: string;
  parentSpanId: string | null;
  traceId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  status?: "ok" | "error";
  metadata?: Record<string, unknown>;
}

const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];
const MAX_COMPLETED = 10000;

export const TraceManager = {
  createTrace(): string {
    return nextId();
  },

  createSpan(operation: string, traceId: string, parentSpanId?: string): Span {
    const span: Span = {
      spanId: nextId(),
      parentSpanId: parentSpanId || null,
      traceId,
      operation,
      startTime: Date.now(),
    };
    activeSpans.set(span.spanId, span);
    return span;
  },

  endSpan(spanId: string, status?: "ok" | "error", metadata?: Record<string, unknown>): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    span.endTime = Date.now();
    span.status = status;
    if (metadata) span.metadata = metadata;
    activeSpans.delete(spanId);
    completedSpans.push(span);
    if (completedSpans.length > MAX_COMPLETED) completedSpans.shift();
  },

  getActiveSpans(): Span[] { return Array.from(activeSpans.values()); },
  getCompletedSpans(windowMs?: number): Span[] {
    if (!windowMs) return [...completedSpans];
    const cutoff = Date.now() - windowMs;
    return completedSpans.filter(s => s.startTime > cutoff);
  },

  getTrace(spanId: string): Span[] {
    const span = completedSpans.find(s => s.spanId === spanId) || activeSpans.get(spanId);
    if (!span) return [];
    const result: Span[] = [span];
    let current = span;
    while (current.parentSpanId) {
      const parent = completedSpans.find(s => s.spanId === current.parentSpanId)
        || activeSpans.get(current.parentSpanId);
      if (!parent) break;
      result.unshift(parent);
      current = parent;
    }
    return result;
  },
};
