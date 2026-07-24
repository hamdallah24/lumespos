import { pgTable, serial, integer, varchar, numeric, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { warehousesTable } from "./warehouses";

export const binsTable = pgTable("bins", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "cascade" }),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  zone: varchar("zone", { length: 50 }),
  aisle: varchar("aisle", { length: 50 }),
  rack: varchar("rack", { length: 50 }),
  shelf: varchar("shelf", { length: 50 }),
  bin: varchar("bin", { length: 50 }),
  capacity: numeric("capacity", { precision: 14, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBinSchema = createInsertSchema(binsTable).omit({ id: true, createdAt: true });
export type Bin = typeof binsTable.$inferSelect;
export type InsertBin = z.infer<typeof insertBinSchema>;