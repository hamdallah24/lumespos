export type EventStatus = "pending" | "delivered" | "failed";

export interface BaseEvent {
  id: string;
  type: string;
  version: number;
  timestamp: Date;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type EventHandler = (event: BaseEvent) => void | Promise<void>;

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  id: string;
}
