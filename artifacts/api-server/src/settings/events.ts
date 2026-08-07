// ConfigCenter — ConfigurationChanged Event Bus.
// Notification-based ONLY. Events never carry configuration values — only
// metadata (revision, scope, changedKeys, actor, correlationId, timestamp).
// Subscribers reconcile by calling SDK.get(...) themselves. Late/duplicate
// events are harmless: revision is monotonic and drives idempotency/self-heal.
// No replay/DLQ/distributed broker in Milestone 1.

import type { ConfigScope } from "./types";

export interface ConfigurationChangedEvent {
  type: "configuration.changed";
  revision: number;
  scope: ConfigScope;
  changedKeys: string[];
  actor: string;
  correlationId: string;
  timestamp: Date;
  version: 1;
}

export type ConfigurationEvent = ConfigurationChangedEvent;

export type ConfigurationEventHandler = (event: ConfigurationEvent) => void | Promise<void>;

export interface ConfigurationEventSubscription {
  id: string;
  handler: ConfigurationEventHandler;
}

// Per-subscriber monotonic revision tracking. Enables at-least-once delivery
// with idempotent reconcile (subscriber ignores events older than its last seen).
export class ConfigEventBus {
  private handlers = new Map<string, ConfigurationEventHandler[]>();
  private lastDeliveredRevision = 0;
  private publishedCount = 0;

  on(id: string, handler: ConfigurationEventHandler): string {
    const list = this.handlers.get(id) ?? [];
    list.push(handler);
    this.handlers.set(id, list);
    return id;
  }

  off(id: string): void {
    this.handlers.delete(id);
  }

  get lastRevision(): number {
    return this.lastDeliveredRevision;
  }

  get subscriberCount(): number {
    let count = 0;
    for (const list of this.handlers.values()) count += list.length;
    return count;
  }

  get publishedEvents(): number {
    return this.publishedCount;
  }

  publish(event: ConfigurationChangedEvent): void {
    this.publishedCount += 1;
    if (event.revision <= this.lastDeliveredRevision) {
      // idempotency gate — late/duplicate event ignored at bus level
      return;
    }
    this.lastDeliveredRevision = event.revision;
    for (const list of this.handlers.values()) {
      for (const handler of list) {
        try {
          void handler(event);
        } catch {
          // subscriber failures are isolated; event delivery must not throw
        }
      }
    }
  }
}

export function createConfigurationChangedEvent(params: {
  revision: number;
  scope: ConfigScope;
  changedKeys: string[];
  actor: string;
  correlationId: string;
}): ConfigurationChangedEvent {
  return {
    type: "configuration.changed",
    version: 1,
    ...params,
    timestamp: new Date(),
  };
}
