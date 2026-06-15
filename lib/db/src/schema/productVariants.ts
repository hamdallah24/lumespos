import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

// Product variants (e.g. size, ice level, toppings)
export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  requiresStock: boolean("requires_stock").notNull().default(true), // ← tambah ini
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true });
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
