import { pgTable, serial, text, integer, numeric, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const itemCategoriesTable = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: integer("parent_id"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  barcode: varchar("barcode", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => itemCategoriesTable.id),
  type: varchar("type", { length: 50 }).notNull().default("raw_material"),
  baseUnit: varchar("base_unit", { length: 20 }).notNull().default("pcs"),
  purchaseUnit: varchar("purchase_unit", { length: 20 }),
  salesUnit: varchar("sales_unit", { length: 20 }),
  purchaseUnitConversion: numeric("purchase_unit_conversion", { precision: 14, scale: 4 }).default("1"),
  salesUnitConversion: numeric("sales_unit_conversion", { precision: 14, scale: 4 }).default("1"),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 4 }).default("0"),
  standardCost: numeric("standard_cost", { precision: 14, scale: 4 }).default("0"),
  defaultSupplierId: integer("default_supplier_id"),
  defaultWarehouseId: integer("default_warehouse_id"),
  reorderPoint: numeric("reorder_point", { precision: 14, scale: 2 }).default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 2 }).default("0"),
  maxStock: numeric("max_stock", { precision: 14, scale: 2 }).default("0"),
  leadTime: integer("lead_time").default(0),
  safetyStock: numeric("safety_stock", { precision: 14, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertItemCategorySchema = createInsertSchema(itemCategoriesTable).omit({ id: true, createdAt: true });

export type Item = typeof itemsTable.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ItemCategory = typeof itemCategoriesTable.$inferSelect;
export type InsertItemCategory = z.infer<typeof insertItemCategorySchema>;