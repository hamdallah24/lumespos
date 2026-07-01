// ECP-015: Runtime Execution Stream — Unified Event Model
// Shared by all Runtimes. Communication backbone for Engineering OS.

export enum RuntimeCategory {
  RUNTIME = "runtime",
  MISSION = "mission",
  TOOL = "tool",
  DECISION = "decision",
  KNOWLEDGE = "knowledge",
  REFLECTION = "reflection",
  MEMORY = "memory",
  CAPABILITY = "capability",
  SYSTEM = "system",
}

export enum RuntimeEventType {
  STARTED = "started",
  PROGRESS = "progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  DELEGATED = "delegated",
  APPROVED = "approved",
  WAITING = "waiting",
  STREAMING = "streaming",
  FINISHED = "finished",
}

export enum RuntimeImportance {
  INFO = "INFO",
  ACTION = "ACTION",
  WARNING = "WARNING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface RuntimeEvent {
  id: string;                          // Unique event ID
  timestamp: number;                   // ms from request start
  runtime: string;                     // Which Runtime (CEO, CTO, COO, etc.)
  component: string;                   // Which component (Planner, KnowledgeLoader, etc.)
  category: RuntimeCategory;
  event: RuntimeEventType;
  importance: RuntimeImportance;
  payload: unknown;
  durationMs?: number;
}

let _eventCounter = 0;

/** Create a new Runtime Event */
export function createEvent(
  runtime: string,
  component: string,
  category: RuntimeCategory,
  event: RuntimeEventType,
  payload: unknown = null,
  importance: RuntimeImportance = RuntimeImportance.INFO,
  durationMs?: number,
): RuntimeEvent {
  _eventCounter++;
  return {
    id: `EVT-${Date.now().toString(36)}-${_eventCounter}`,
    timestamp: Date.now(),
    runtime,
    component,
    category,
    event,
    importance,
    payload,
    durationMs,
  };
}
