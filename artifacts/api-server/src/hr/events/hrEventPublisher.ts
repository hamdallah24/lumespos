import { db, hrEventsTable } from "@workspace/db";

export async function publishHrEvent(
  eventType: string,
  aggregateType: string,
  aggregateId: number,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Promise<void> {
  await db.insert(hrEventsTable).values({
    eventType,
    aggregateType,
    aggregateId,
    data: data as any,
    metadata: (metadata || { publishedAt: new Date().toISOString() }) as any,
  });
}
