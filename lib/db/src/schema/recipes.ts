import { pgTable, serial, text, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Bill of Materials (BOM). A parent (finished product OR semi-finished good)
// is composed of components (raw ingredients OR semi-finished goods).
export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  parentType: text("parent_type").notNull(), // 'product' | 'semi_finished'
  parentId: integer("parent_id").notNull(),
  componentType: text("component_type").notNull(), // 'ingredient' | 'semi_finished'
  componentId: integer("component_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(), // takaran per 1 parent
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
