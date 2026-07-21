import { pgTable, bigserial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const hrEventsTable = pgTable("hr_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventType: text("event_type").notNull(),
  aggregateType: text("aggregate_type").notNull(), // employee | attendance | leave | payroll
  aggregateId: integer("aggregate_id").notNull(),
  data: jsonb("data").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HrEvent = typeof hrEventsTable.$inferSelect;
