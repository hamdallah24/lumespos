import type { EventPriority } from "./EventPriority";

export interface EventEnvelope {
  id: string;
  type: string;
  version: number;
  timestamp: Date;
  priority: EventPriority;
  source: string;
  aggregateId: string;
  aggregateType: string;
  branchId: number;
  userId?: number;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  originalEventId?: string;
}

export function createEnvelope(
  type: string,
  priority: EventPriority,
  data: Record<string, unknown>,
  source: string,
  branchId: number,
  aggregateId: string,
  aggregateType: string,
  userId?: number,
): EventEnvelope {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    version: 1,
    timestamp: new Date(),
    priority,
    source,
    aggregateId,
    aggregateType,
    branchId,
    userId,
    data,
  };
}
