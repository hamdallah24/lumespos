import { pgTable, serial, integer, varchar, numeric, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { itemsTable } from "./items";

export const uomsTable = pgTable("uoms", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("count"),
  decimalPlaces: integer("decimal_places").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uomConversionsTable = pgTable("uom_conversions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "cascade" }),
  fromUomId: integer("from_uom_id").notNull().references(() => uomsTable.id, { onDelete: "cascade" }),
  toUomId: integer("to_uom_id").notNull().references(() => uomsTable.id, { onDelete: "cascade" }),
  conversionFactor: numeric("conversion_factor", { precision: 20, scale: 10 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUomSchema = createInsertSchema(uomsTable).omit({ id: true, createdAt: true });
export const insertUomConversionSchema = createInsertSchema(uomConversionsTable).omit({ id: true, createdAt: true });

export type Uom = typeof uomsTable.$inferSelect;
export type InsertUom = z.infer<typeof insertUomSchema>;
export type UomConversion = typeof uomConversionsTable.$inferSelect;
export type InsertUomConversion = z.infer<typeof insertUomConversionSchema>;