import { pgTable, serial, integer, text, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

// Hanya SATU definisi tabel, gunakan nama semiFinishedTable
export const semiFinishedTable = pgTable("semi_finished", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("gram"),
  // Kolom yield (hasil produksi per batch)
  yieldQuantity: numeric("yield_quantity", { precision: 14, scale: 2 })
    .notNull()
    .default("1"),
  yieldUnit: varchar("yield_unit", { length: 20 })
    .notNull()
    .default("pcs"),
  costPricePerUnit: numeric("cost_price_per_unit", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Schema untuk insert (zod)
export const insertSemiFinishedSchema = createInsertSchema(semiFinishedTable).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertSemiFinished = z.infer<typeof insertSemiFinishedSchema>;
export type SemiFinished = typeof semiFinishedTable.$inferSelect;