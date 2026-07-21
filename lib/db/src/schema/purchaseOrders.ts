import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { branchesTable } from "./branches";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "restrict" }),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft"), // draft → submitted → approved → sent → partial → completed → cancelled
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  shippingCost: numeric("shipping_cost", { precision: 14, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // ingredient | semi_finished
  itemId: integer("item_id").notNull(),
  quantityOrdered: numeric("quantity_ordered", { precision: 14, scale: 4 }).notNull(),
  quantityReceived: numeric("quantity_received", { precision: 14, scale: 4 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true });
export const insertPoItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type InsertPoItem = z.infer<typeof insertPoItemSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PoItem = typeof purchaseOrderItemsTable.$inferSelect;
