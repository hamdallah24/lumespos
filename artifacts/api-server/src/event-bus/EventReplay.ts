import { eventBus } from "./EventBus";

export const EventReplay = {
  async from(sequence: number): Promise<void> {
    return eventBus.replayFrom(sequence);
  },
};
