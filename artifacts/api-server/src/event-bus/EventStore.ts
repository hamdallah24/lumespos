import { db, eventStoreTable } from "@workspace/db";
import type { BaseEvent } from "./types";

export class EventStore {
  async append(event: BaseEvent): Promise<number> {
    const [row] = await db
      .insert(eventStoreTable)
      .values({
        eventType: event.type,
        eventVersion: event.version,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        data: event.data as Record<string, unknown>,
        metadata: (event.metadata as Record<string, unknown>) ?? null,
        createdAt: event.timestamp,
      })
      .returning({ sequence: eventStoreTable.sequence });
    return row.sequence;
  }

  async replay(fromSequence: number = 0, limit: number = 1000): Promise<BaseEvent[]> {
    const { eq, and, gte } = await import("drizzle-orm");
    const conditions: any[] = [];
    if (fromSequence > 0) {
      conditions.push(gte(eventStoreTable.sequence, fromSequence));
    }
    const rows = await db
      .select()
      .from(eventStoreTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(eventStoreTable.sequence)
      .limit(limit);

    return rows.map(this.toEvent);
  }

  async replayByType(
    eventType: string,
    fromSequence: number = 0,
    limit: number = 1000,
  ): Promise<BaseEvent[]> {
    const { eq, and, gte } = await import("drizzle-orm");
    const conditions: any[] = [eq(eventStoreTable.eventType, eventType)];
    if (fromSequence > 0) {
      conditions.push(gte(eventStoreTable.sequence, fromSequence));
    }
    const rows = await db
      .select()
      .from(eventStoreTable)
      .where(and(...conditions))
      .orderBy(eventStoreTable.sequence)
      .limit(limit);
    return rows.map(this.toEvent);
  }

  async getLatestSequence(): Promise<number> {
    const [row] = await db
      .select({ max: eventStoreTable.sequence })
      .from(eventStoreTable)
      .orderBy(eventStoreTable.sequence)
      .limit(1);
    return row?.max ?? 0;
  }

  private toEvent(row: typeof eventStoreTable.$inferSelect): BaseEvent {
    return {
      id: `evt-${row.sequence}`,
      type: row.eventType,
      version: row.eventVersion,
      timestamp: row.createdAt,
      aggregateId: row.aggregateId ?? "",
      aggregateType: row.aggregateType ?? "",
      data: row.data as Record<string, unknown>,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    };
  }
}
