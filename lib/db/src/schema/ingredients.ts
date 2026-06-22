import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "restrict" }), // ✅ restrict, bukan cascade
  name: text("name").notNull(),
  unit: text("unit").notNull().default("ml"), // ✅ default ml, lebih cocok untuk Lumé
  costPricePerUnit: numeric("cost_price_per_unit", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  minimalStock: numeric("minimal_stock", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  trackInShift: boolean("track_in_shift").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), // ✅ tambah updatedAt
});

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;