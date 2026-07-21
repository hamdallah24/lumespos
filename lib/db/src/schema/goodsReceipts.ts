import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { warehousesTable } from "./warehouses";
import { purchaseOrdersTable } from "./purchaseOrders";

export const goodsReceiptsTable = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  grNumber: text("gr_number").notNull().unique(),
  poId: integer("po_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "restrict" }),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id, { onDelete: "restrict" }),
  receivedDate: date("received_date").notNull(),
  status: text("status").notNull().default("completed"), // draft | completed | voided
  notes: text("notes"),
  receivedBy: integer("received_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goodsReceiptItemsTable = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull().references(() => goodsReceiptsTable.id, { onDelete: "cascade" }),
  poItemId: integer("po_item_id").notNull(),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
});

export type GoodsReceipt = typeof goodsReceiptsTable.$inferSelect;
export type GoodsReceiptItem = typeof goodsReceiptItemsTable.$inferSelect;
