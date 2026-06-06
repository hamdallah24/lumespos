import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

// Semi-finished goods (bahan setengah jadi)
export const semiFinishedTable = pgTable("semi_finished", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("gram"), // gram | ml | pcs
  costPricePerUnit: numeric("cost_price_per_unit", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSemiFinishedSchema = createInsertSchema(semiFinishedTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSemiFinished = z.infer<typeof insertSemiFinishedSchema>;
export type SemiFinished = typeof semiFinishedTable.$inferSelect;
