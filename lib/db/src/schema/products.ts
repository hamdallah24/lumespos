import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { branchesTable } from "./branches";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  requiresStock: boolean("requires_stock").notNull().default(true), // ← tambah ini
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// HAPUS: costPrice dan stock dari schema

export const insertProductSchema = createInsertSchema(productsTable).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;