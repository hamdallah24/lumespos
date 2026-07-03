// ECP-035: Kernel Event Bus — central event dispatch
// Frozen. Replaces all direct runtime-to-runtime calls.
// No Runtime may call another Runtime directly.

import type { KernelEvent } from "./kernel-types";

type EventHandler = (event: KernelEvent) => void;

class KernelEventBus {
  private _handlers = new Map<string, EventHandler[]>();

  emit(event: Omit<KernelEvent, "timestamp">): void {
    const full: KernelEvent = { ...event, timestamp: Date.now() };
    const handlers = this._handlers.get(event.type) || [];
    for (const handler of handlers) {
      try { handler(full); } catch { /* Skip failed handler */ }
    }
  }

  on(eventType: string, handler: EventHandler): void {
    const handlers = this._handlers.get(eventType) || [];
    handlers.push(handler);
    this._handlers.set(eventType, handlers);
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this._handlers.get(eventType) || [];
    this._handlers.set(eventType, handlers.filter(h => h !== handler));
  }

  /** Dispatch a request to the appropriate runtime and await result */
  async dispatch(target: string, action: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      const handler = this._handlers.get(`dispatch:${target}:${action}`) || [];
      if (handler.length === 0) {
        resolve(null);
        return;
      }
      // Call first handler (should be the target runtime)
      try {
        const result = handler[0]({ type: `dispatch:${target}:${action}`, source: "kernel", payload, timestamp: Date.now() });
        resolve(result);
      } catch {
        resolve(null);
      }
    });
  }
}

export const kernelEventBus = new KernelEventBus();
