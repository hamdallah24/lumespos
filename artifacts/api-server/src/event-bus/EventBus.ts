import { EventEmitter } from "events";
import type { BaseEvent, EventHandler, EventSubscription } from "./types";
import { EventStore } from "./EventStore";
import { validateEvent } from "./EventSerializer";

export class EventBus {
  private emitter = new EventEmitter();
  private store = new EventStore();
  private subscriptions = new Map<string, EventSubscription[]>();

  getEventStore(): EventStore {
    return this.store;
  }

  subscribe(
    eventType: string,
    handler: EventHandler,
    id?: string,
  ): string {
    const subId = id ?? `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sub: EventSubscription = { eventType, handler, id: subId };

    const existing = this.subscriptions.get(eventType) ?? [];
    existing.push(sub);
    this.subscriptions.set(eventType, existing);

    this.emitter.on(eventType, handler);
    return subId;
  }

  unsubscribe(subId: string): void {
    for (const [eventType, subs] of this.subscriptions) {
      const idx = subs.findIndex((s) => s.id === subId);
      if (idx !== -1) {
        this.emitter.off(eventType, subs[idx].handler);
        subs.splice(idx, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventType);
        }
        return;
      }
    }
  }

  async publish(event: BaseEvent): Promise<void> {
    if (!validateEvent(event)) {
      console.error(`[EventBus] Validation failed for event ${event.type}`);
      return;
    }

    // Emit to subscribers first — critical: don't block on persistence
    this.emitter.emit(event.type, event);
    this.emitter.emit("*", event);

    try {
      await this.store.append(event);
    } catch (err) {
      console.error(`[EventBus] Failed to persist event ${event.type}:`, err);
    }
  }

  async replayFrom(sequence: number): Promise<void> {
    const events = await this.store.replay(sequence);
    for (const event of events) {
      this.emitter.emit(event.type, event);
      this.emitter.emit("*", event);
    }
  }

  subscriberCount(eventType?: string): number {
    if (eventType) {
      return this.subscriptions.get(eventType)?.length ?? 0;
    }
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }
}

export const eventBus = new EventBus();
