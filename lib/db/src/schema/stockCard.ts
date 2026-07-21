import { pgTable, bigserial, text, integer, numeric, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { warehousesTable } from "./warehouses";

export const stockCardTable = pgTable(
  "stock_card",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "restrict" }),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehousesTable.id, { onDelete: "restrict" }),
    itemType: text("item_type").notNull(), // 'ingredient' | 'semi_finished' | 'product'
    itemId: integer("item_id").notNull(),
    movementType: text("movement_type").notNull(), // one of 12 types
    direction: text("direction").notNull(), // 'in' | 'out'
    qtyBefore: numeric("qty_before", { precision: 14, scale: 4 }).notNull(),
    qtyChange: numeric("qty_change", { precision: 14, scale: 4 }).notNull(),
    qtyAfter: numeric("qty_after", { precision: 14, scale: 4 }).notNull(),
    valueBefore: numeric("value_before", { precision: 14, scale: 2 }).notNull().default("0"),
    valueChange: numeric("value_change", { precision: 14, scale: 2 }).notNull().default("0"),
    valueAfter: numeric("value_after", { precision: 14, scale: 2 }).notNull().default("0"),
    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),
    referenceType: text("reference_type"),
    referenceId: integer("reference_id"),
    batchId: text("batch_id"),
    description: text("description"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_card_item_idx").on(table.branchId, table.warehouseId, table.itemType, table.itemId, table.createdAt),
    index("stock_card_ref_idx").on(table.referenceType, table.referenceId),
    index("stock_card_created_idx").on(table.createdAt),
  ],
);

export const insertStockCardSchema = createInsertSchema(stockCardTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockCard = z.infer<typeof insertStockCardSchema>;
export type StockCardEntry = typeof stockCardTable.$inferSelect;
