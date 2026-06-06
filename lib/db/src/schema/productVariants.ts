import { pgTable, serial, text, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

// Product variants (e.g. size, ice level, toppings)
export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Large", "Less Sugar", "Extra Boba"
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true });
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
