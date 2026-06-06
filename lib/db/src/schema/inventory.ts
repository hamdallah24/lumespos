import { pgTable, serial, text, integer, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

// Live stock level per item per branch.
export const currentInventoryTable = pgTable(
  "current_inventory",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(), // 'ingredient' | 'semi_finished'
    itemId: integer("item_id").notNull(),
    currentStock: numeric("current_stock", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  (t) => [unique("uniq_inventory_item").on(t.branchId, t.itemType, t.itemId)],
);

// Ledger of every stock movement.
export const stockAdjustmentsTable = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'ingredient' | 'semi_finished'
  itemId: integer("item_id").notNull(),
  adjustmentType: text("adjustment_type").notNull(), // 'in' | 'out' | 'loss'
  quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
  purchasePriceTotal: numeric("purchase_price_total", { precision: 14, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCurrentInventorySchema = createInsertSchema(currentInventoryTable).omit({
  id: true,
});
export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustmentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type CurrentInventory = typeof currentInventoryTable.$inferSelect;
export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
