import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  cashierName: text("cashier_name"),
  cashierId: integer("cashier_id").references(() => usersTable.id, { onDelete: "set null" }),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  totalCogs: numeric("total_cogs", { precision: 14, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  change: numeric("change", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  productVariantId: integer("product_variant_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priceAtSale: numeric("price_at_sale", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
