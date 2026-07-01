// ECP-015: Execution Stream — thin SSE wrapper for Runtime Events
// emitToStream() writes structured SSE to Express Response
import { RuntimeEvent, RuntimeCategory, RuntimeEventType, RuntimeImportance, createEvent } from "./runtime-event";

/** Emit a Runtime Event to the SSE response stream */
export function emitToStream(res: any, event: RuntimeEvent): void {
  res.write(`data: ${JSON.stringify({
    type: event.category,
    runtime: event.runtime,
    component: event.component,
    event: event.event,
    importance: event.importance,
    id: event.id,
    timestampMs: event.timestamp,
    durationMs: event.durationMs,
    payload: event.payload,
  })}\n\n`);
}

/** Shorthand: emit a TOOL category event */
export function emitToolEvent(res: any, runtime: string, component: string, status: "started" | "completed" | "failed", toolName: string, durationMs?: number): RuntimeEvent {
  const event = createEvent(
    runtime, component,
    RuntimeCategory.TOOL,
    status === "started" ? RuntimeEventType.STARTED : status === "completed" ? RuntimeEventType.COMPLETED : RuntimeEventType.FAILED,
    { name: toolName },
    status === "failed" ? RuntimeImportance.ERROR : RuntimeImportance.INFO,
    durationMs,
  );
  emitToStream(res, event);
  return event;
}

/** Shorthand: emit a STATE (pipeline progress) event */
export function emitStateEvent(res: any, runtime: string, state: string, importance: RuntimeImportance = RuntimeImportance.INFO): RuntimeEvent {
  const event = createEvent(
    runtime, "Pipeline",
    RuntimeCategory.SYSTEM,
    RuntimeEventType.PROGRESS,
    { state },
    importance,
  );
  emitToStream(res, event);
  return event;
}

/** Shorthand: emit a RUNTIME category event (delegation, approval, etc.) */
export function emitRuntimeEvent(res: any, runtime: string, eventType: RuntimeEventType, payload: unknown = null): RuntimeEvent {
  const event = createEvent(
    runtime, runtime,
    RuntimeCategory.RUNTIME,
    eventType,
    payload,
    RuntimeImportance.ACTION,
  );
  emitToStream(res, event);
  return event;
}
