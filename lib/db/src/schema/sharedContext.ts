import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const sharedContextTable = pgTable("shared_context", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSharedContextSchema = createInsertSchema(sharedContextTable).omit({
  id: true, createdAt: true,
});
export type InsertSharedContext = z.infer<typeof insertSharedContextSchema>;
export type SharedContext = typeof sharedContextTable.$inferSelect;
