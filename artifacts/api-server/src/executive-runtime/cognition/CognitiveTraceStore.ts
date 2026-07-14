import type { CognitiveTrace, ExecutiveRole } from "./CognitiveContracts";

interface TraceRecord {
  trace: CognitiveTrace;
  role: ExecutiveRole;
  query: string;
  timestamp: string;
}

const MAX_TRACES = 100;
const traces: TraceRecord[] = [];

export function recordTrace(role: ExecutiveRole, query: string, trace: CognitiveTrace): void {
  traces.unshift({ role, query, trace, timestamp: new Date().toISOString() });
  if (traces.length > MAX_TRACES) traces.length = MAX_TRACES;
}

export function getRecentTraces(limit = 10): TraceRecord[] {
  return traces.slice(0, limit);
}

export function getTracesByRole(role: ExecutiveRole, limit = 10): TraceRecord[] {
  return traces.filter(t => t.role === role).slice(0, limit);
}

export function getTraceSummary(trace: CognitiveTrace): string {
  const steps = trace.steps.map(s => `${s.phase} (${s.status})`).join(" → ");
  return `[${trace.correlationId}] ${trace.status} — ${trace.durationMs}ms — ${steps}`;
}

export function clearTraces(): void {
  traces.length = 0;
}
