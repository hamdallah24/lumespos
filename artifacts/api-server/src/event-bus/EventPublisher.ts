import { eventBus } from "./EventBus";
import type { BaseEvent } from "./types";

export const EventPublisher = {
  publish(event: BaseEvent): Promise<void> {
    return eventBus.publish(event);
  },
};
