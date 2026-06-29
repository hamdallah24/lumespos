// SPRINT 3: Minimal Event System
// BeforeValidation, AfterValidation, ToolExecuted, LLMCompleted

type EventHandler = (payload: any) => void;

const _listeners = new Map<string, EventHandler[]>();

export function on(event: string, handler: EventHandler): void {
  if (!_listeners.has(event)) _listeners.set(event, []);
  _listeners.get(event)!.push(handler);
}

export function off(event: string, handler: EventHandler): void {
  const handlers = _listeners.get(event);
  if (!handlers) return;
  _listeners.set(event, handlers.filter(h => h !== handler));
}

export function emit(event: string, payload?: any): void {
  const handlers = _listeners.get(event);
  if (!handlers?.length) return;
  for (const h of handlers) {
    try { h(payload); } catch (e) { console.error(`[Events] Handler error for "${event}":`, e); }
  }
}

// ── Predefined events ──

export const Events = {
  BeforeValidation: "before:validation",
  AfterValidation:  "after:validation",
  ToolExecuted:     "tool:executed",
  LLMCompleted:     "llm:completed",
  LLMError:         "llm:error",
} as const;

// ── Integrate into callDeepSeekWithTools prompt location ──
// Usage:
//   import { emit, Events } from "./runtime/events";
//   emit(Events.ToolExecuted, { name: "readFile", durationMs: 53 });
//   emit(Events.BeforeValidation, { textLength: response.length });
//   emit(Events.AfterValidation, { warnings: result.warnings });
//   emit(Events.LLMCompleted, { durationMs, roundCount });

// ── Component metadata ──

export const eventSystem = {
  name: "EventSystem",
  version: "1.0.0",
  capabilities: ["event-emission", "event-subscription"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
