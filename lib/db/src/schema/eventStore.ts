import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const eventStoreTable = pgTable("event_store", {
  sequence: serial("sequence").primaryKey(),
  eventType: text("event_type").notNull(),
  eventVersion: integer("event_version").notNull().default(1),
  aggregateId: text("aggregate_id"),
  aggregateType: text("aggregate_type"),
  data: jsonb("data").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
