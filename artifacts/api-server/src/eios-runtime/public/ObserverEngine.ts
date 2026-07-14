import type { RuntimeEvent } from "../contracts/EventContracts";
import type { ObserverDefinition } from "../internal/runtime-metadata/ObserverRegistry";
import { ObserverRegistry } from "../internal/runtime-metadata/ObserverRegistry";

export type DeliveryMode = "FireAndForget" | "ExactlyOnce" | "AtLeastOnce" | "Buffered";

const MAX_RETRIES = 3;

interface DeadLetterRecord {
  eventId: string;
  observerId: string;
  payload: unknown;
  error: string;
  failedAt: string;
  retryCount: number;
}

const deadLetterQueue: DeadLetterRecord[] = [];
const bufferQueue: Array<{ observer: ObserverDefinition; event: RuntimeEvent }> = [];

export const ObserverEngine = {
  async dispatch(event: RuntimeEvent): Promise<void> {
    const observers = ObserverRegistry.getObserversForEvent(event.type.name);
    const sorted = observers.sort((a, b) => a.priority - b.priority);

    for (const obs of sorted) {
      if (obs.deliveryMode === "FireAndForget") {
        obs.handle(event).catch(() => {});
      } else if (obs.deliveryMode === "ExactlyOnce" || obs.deliveryMode === "AtLeastOnce") {
        await this.dispatchWithRetry(obs, event);
      } else if (obs.deliveryMode === "Buffered") {
        bufferQueue.push({ observer: obs, event });
      }
    }
  },

  async flushBuffer(): Promise<void> {
    while (bufferQueue.length > 0) {
      const item = bufferQueue.shift()!;
      await this.dispatchWithRetry(item.observer, item.event);
    }
  },

  async dispatchWithRetry(observer: ObserverDefinition, event: RuntimeEvent): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await observer.handle(event);
        return;
      } catch (err) {
        lastError = err as Error;
      }
    }
    deadLetterQueue.push({
      eventId: event.id,
      observerId: `${observer.id.namespace}:${observer.id.type}:${observer.id.name}`,
      payload: event.payload,
      error: String(lastError),
      failedAt: new Date().toISOString(),
      retryCount: MAX_RETRIES,
    });
  },

  getDeadLetterQueue(): DeadLetterRecord[] {
    return [...deadLetterQueue];
  },

  async replayDeadLetter(index: number): Promise<void> {
    const record = deadLetterQueue[index];
    if (!record) return;
    const obsName = record.observerId.split(":").pop() || record.observerId;
    const observers = ObserverRegistry.getObserversForEvent(obsName);
    for (const obs of observers) {
      try {
        await obs.handle({
          id: record.eventId,
          correlationId: "",
          type: { namespace: "custom", type: "event", name: record.observerId, version: { major: 1, minor: 0, patch: 0 } },
          payload: record.payload,
          timestamp: new Date().toISOString(),
          version: { major: 1, minor: 0, patch: 0 },
        });
        deadLetterQueue.splice(index, 1);
      } catch { /* keep in DLQ */ }
    }
  },

  clearDeadLetterQueue(): void {
    deadLetterQueue.length = 0;
  },
};
