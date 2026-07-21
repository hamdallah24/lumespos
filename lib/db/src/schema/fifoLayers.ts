import { pgTable, bigserial, text, integer, numeric, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { warehousesTable } from "./warehouses";

export const fifoLayersTable = pgTable("fifo_layers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "restrict" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  stockCardId: bigint("stock_card_id", { mode: "number" })
    .notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const insertFifoLayerSchema = createInsertSchema(fifoLayersTable).omit({
  id: true,
});
export type InsertFifoLayer = z.infer<typeof insertFifoLayerSchema>;
export type FifoLayer = typeof fifoLayersTable.$inferSelect;
