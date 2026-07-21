import { pgTable, bigserial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const purchaseEventsTable = pgTable("purchase_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventType: text("event_type").notNull(),
  aggregateType: text("aggregate_type").notNull(), // supplier | purchase_order
  aggregateId: integer("aggregate_id").notNull(),
  data: jsonb("data").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PurchaseEvent = typeof purchaseEventsTable.$inferSelect;
