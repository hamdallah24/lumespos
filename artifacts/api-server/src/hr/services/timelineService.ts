import { db, hrEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function getEmployeeTimeline(employeeId: number): Promise<any[]> {
  return db
    .select({
      id: hrEventsTable.id,
      eventType: hrEventsTable.eventType,
      data: hrEventsTable.data,
      metadata: hrEventsTable.metadata,
      createdAt: hrEventsTable.createdAt,
    })
    .from(hrEventsTable)
    .where(eq(hrEventsTable.aggregateId, employeeId))
    .orderBy(desc(hrEventsTable.createdAt));
}

export async function getRecentHrEvents(limit = 20): Promise<any[]> {
  return db
    .select()
    .from(hrEventsTable)
    .orderBy(desc(hrEventsTable.createdAt))
    .limit(limit);
}
