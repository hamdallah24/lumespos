// ECP-032.5: Event Bus — lightweight runtime event publisher
// Frozen. Runtimes publish events. Telemetry subscribes.
// Not a message queue — in-memory pub/sub only.

type EventHandler = (event: { type: string; payload: unknown }) => void;

class EventBus {
  private _handlers = new Map<string, EventHandler[]>();

  publish(event: { type: string; payload: unknown }): void {
    const handlers = this._handlers.get(event.type) || [];
    for (const handler of handlers) {
      try { handler(event); } catch { /* Skip failed handler */ }
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this._handlers.get(eventType) || [];
    handlers.push(handler);
    this._handlers.set(eventType, handlers);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this._handlers.get(eventType) || [];
    this._handlers.set(eventType, handlers.filter(h => h !== handler));
  }
}

export const eventBus = new EventBus();
