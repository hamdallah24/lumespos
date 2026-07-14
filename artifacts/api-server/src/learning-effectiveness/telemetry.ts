import type { TelemetryEvent, TelemetryEventType, TelemetryResult, TelemetrySeverity, TelemetryCategory } from "./types";
import { TelemetryStore as TelemetryStoreImpl } from "./types";

export const learningTelemetry = new TelemetryStoreImpl();

// ── TraceContext ──

let activeTraceId: string | null = null;
let activeSessionId: string | null = null;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const TraceContext = {
  startTrace(): string {
    activeTraceId = generateId();
    return activeTraceId;
  },
  getTraceId(): string | null {
    return activeTraceId;
  },
  setTraceId(id: string): void {
    activeTraceId = id;
  },
  clearTrace(): void {
    activeTraceId = null;
  },

  startSession(): string {
    activeSessionId = generateId();
    return activeSessionId;
  },
  getSessionId(): string | null {
    return activeSessionId;
  },
  setSessionId(id: string): void {
    activeSessionId = id;
  },
  clearSession(): void {
    activeSessionId = null;
  },

  generateChildTrace(): string {
    const child = generateId();
    return child;
  },
};

// ── Record Helper ──

export function recordTelemetry(params: {
  type: TelemetryEventType;
  category?: TelemetryCategory;
  severity?: TelemetrySeverity;
  executive?: string;
  engine?: string;
  adapter?: string;
  capability?: string;
  durationMs: number;
  result: TelemetryResult;
  correlationId?: string;
  parentEventId?: string;
  parentTraceId?: string;
  runtime?: string;
  environment?: string;
  sessionId?: string;
  traceId?: string;
  executiveRole?: string;
  missionType?: string;
  learningEngine?: string;
  decisionId?: string;
  missionId?: string;
  organizationId?: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
}): TelemetryEvent {
  const now = new Date();
  const ts = now.toISOString();
  return learningTelemetry.record({
    type: params.type,
    category: params.category ?? inferCategory(params.type),
    severity: params.severity ?? "INFO",
    timestamp: ts,
    startTime: params.metadata?.startTime as string ?? ts,
    endTime: params.metadata?.endTime as string ?? ts,
    durationMs: params.durationMs,
    result: params.result,
    traceId: params.traceId ?? TraceContext.getTraceId() ?? undefined,
    sessionId: params.sessionId ?? TraceContext.getSessionId() ?? undefined,
    parentTraceId: params.parentTraceId,
    parentEventId: params.parentEventId,
    runtime: params.runtime ?? "learning-runtime",
    environment: params.environment ?? process.env["NODE_ENV"] ?? "development",
    executive: params.executive,
    engine: params.engine,
    adapter: params.adapter,
    capability: params.capability,
    correlationId: params.correlationId,
    executiveRole: params.executiveRole ?? params.executive,
    missionType: params.missionType,
    learningEngine: params.learningEngine ?? params.engine,
    decisionId: params.decisionId,
    missionId: params.missionId,
    organizationId: params.organizationId,
    branchId: params.branchId,
    metadata: params.metadata,
  });
}

function inferCategory(type: TelemetryEventType): TelemetryCategory {
  switch (type) {
    case "retrieve": return "retrieve";
    case "ingest": return "ingest";
    case "feedback": return "feedback";
    case "maintenance": return "maintenance";
    case "executive_decision": case "council_decision": return "decision";
    case "confidence_adjustment": return "knowledge";
    case "promotion": case "deprecation": case "archive": return "knowledge";
    default: return "health";
  }
}
