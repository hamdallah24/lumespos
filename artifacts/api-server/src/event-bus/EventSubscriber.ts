import { eventBus } from "./EventBus";
import type { EventHandler } from "./types";

export const EventSubscriber = {
  on(eventType: string, handler: EventHandler, id?: string): string {
    return eventBus.subscribe(eventType, handler, id);
  },

  off(subId: string): void {
    eventBus.unsubscribe(subId);
  },
};
