import { Router } from "express";
import { db, ingredientsTable, semiFinishedTable, productsTable, productVariantsTable, recipesTable, currentInventoryTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

export async function runMigration(
  tx: any,
  sourceBranchId: number,
  targetBranchId: number,
  includeIngredients: boolean,
  includeSemiFinished: boolean,
  includeProducts: boolean,
  overwrite: boolean,
) {
  const stats: Record<string, number> = {};
  const ingMap = new Map<number, number>();
  const sfMap = new Map<number, number>();
  const prodMap = new Map<number, number>();
  const varMap = new Map<number, number>();
  const targetProductIds = new Set<number>();
  const targetVariantIds = new Set<number>();
  const targetSfIds = new Set<number>();

  // 1. Ingredients
  if (includeIngredients) {
    const src = await tx.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, sourceBranchId));
    for (const ing of src) {
      const [existing] = await tx.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, targetBranchId), eq(ingredientsTable.name, ing.name)));
      if (existing) {
        if (overwrite) await tx.update(ingredientsTable).set({ unit: ing.unit, costPricePerUnit: ing.costPricePerUnit, minimalStock: ing.minimalStock, trackInShift: ing.trackInShift }).where(eq(ingredientsTable.id, existing.id));
        ingMap.set(ing.id, existing.id);
        if (overwrite) stats.ingredients = (stats.ingredients || 0) + 1;
        continue;
      }
      const [created] = await tx.insert(ingredientsTable).values({ branchId: targetBranchId, name: ing.name, unit: ing.unit, costPricePerUnit: ing.costPricePerUnit, minimalStock: ing.minimalStock, trackInShift: ing.trackInShift }).returning();
      ingMap.set(ing.id, created.id);
      stats.ingredients = (stats.ingredients || 0) + 1;
    }
  }

  // 2. Semi Finished
  if (includeSemiFinished) {
    const src = await tx.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, sourceBranchId));
    for (const sf of src) {
      const [existing] = await tx.select().from(semiFinishedTable).where(and(eq(semiFinishedTable.branchId, targetBranchId), eq(semiFinishedTable.name, sf.name)));
      if (existing) {
        if (overwrite) await tx.update(semiFinishedTable).set({ unit: sf.unit, yieldQuantity: sf.yieldQuantity, yieldUnit: sf.yieldUnit, costPricePerUnit: sf.costPricePerUnit, trackInShift: sf.trackInShift }).where(eq(semiFinishedTable.id, existing.id));
        sfMap.set(sf.id, existing.id);
        targetSfIds.add(existing.id);
        if (overwrite) stats.semiFinished = (stats.semiFinished || 0) + 1;
        continue;
      }
      const [created] = await tx.insert(semiFinishedTable).values({ branchId: targetBranchId, name: sf.name, unit: sf.unit, yieldQuantity: sf.yieldQuantity, yieldUnit: sf.yieldUnit, costPricePerUnit: sf.costPricePerUnit, trackInShift: sf.trackInShift }).returning();
      sfMap.set(sf.id, created.id);
      targetSfIds.add(created.id);
      stats.semiFinished = (stats.semiFinished || 0) + 1;
    }
  }

  // 3. Products
  if (includeProducts) {
    const src = await tx.select().from(productsTable).where(eq(productsTable.branchId, sourceBranchId));
    for (const prod of src) {
      const [existing] = await tx.select().from(productsTable).where(and(eq(productsTable.branchId, targetBranchId), eq(productsTable.name, prod.name)));
      if (existing) {
        if (overwrite) await tx.update(productsTable).set({ categoryId: prod.categoryId, price: prod.price, imageUrl: prod.imageUrl, isActive: prod.isActive, requiresStock: prod.requiresStock }).where(eq(productsTable.id, existing.id));
        prodMap.set(prod.id, existing.id);
        targetProductIds.add(existing.id);
        if (overwrite) stats.products = (stats.products || 0) + 1;
        continue;
      }
      const [created] = await tx.insert(productsTable).values({ branchId: targetBranchId, name: prod.name, categoryId: prod.categoryId, price: prod.price, imageUrl: prod.imageUrl, isActive: prod.isActive, requiresStock: prod.requiresStock }).returning();
      prodMap.set(prod.id, created.id);
      targetProductIds.add(created.id);
      stats.products = (stats.products || 0) + 1;
    }
  }

  // 4. Product Variants
  if (includeProducts && prodMap.size > 0) {
    const oldIds = Array.from(prodMap.keys());
    const srcVariants = await tx.select().from(productVariantsTable).where(inArray(productVariantsTable.productId, oldIds));
    if (overwrite) {
      const tgtProdIds = Array.from(targetProductIds);
      if (tgtProdIds.length > 0) await tx.delete(productVariantsTable).where(inArray(productVariantsTable.productId, tgtProdIds));
    }
    let count = 0;
    for (const v of srcVariants) {
      const newProductId = prodMap.get(v.productId);
      if (!newProductId) continue;
      const [created] = await tx.insert(productVariantsTable).values({ productId: newProductId, name: v.name, price: v.price, requiresStock: v.requiresStock }).returning();
      varMap.set(v.id, created.id);
      targetVariantIds.add(created.id);
      count++;
    }
    stats.variants = count;
  }

  // 5. Recipes (BOM)
  if (includeProducts) {
    const prodKeys = Array.from(prodMap.keys());
    const sfKeys = Array.from(sfMap.keys());
    const varKeys = Array.from(varMap.keys());
    const allRecipeRows: { parentType: string; parentId: number; componentType: string; componentId: number; quantity: string }[] = [];
    if (prodKeys.length > 0) {
      const rows = await tx.select().from(recipesTable).where(and(eq(recipesTable.parentType, "product"), inArray(recipesTable.parentId, prodKeys)));
      allRecipeRows.push(...rows);
    }
    if (varKeys.length > 0) {
      const rows = await tx.select().from(recipesTable).where(and(eq(recipesTable.parentType, "product_variant"), inArray(recipesTable.parentId, varKeys)));
      allRecipeRows.push(...rows);
    }
    if (sfKeys.length > 0) {
      const rows = await tx.select().from(recipesTable).where(and(eq(recipesTable.parentType, "semi_finished"), inArray(recipesTable.parentId, sfKeys)));
      allRecipeRows.push(...rows);
    }

    const newSfIds = new Set<number>();
    const newIngIds = new Set<number>();
    let pendingSfRecipeRows: typeof allRecipeRows = [];

    for (const r of allRecipeRows) {
      if (r.componentType === "semi_finished" && !sfMap.has(r.componentId)) newSfIds.add(r.componentId);
      if (r.componentType === "ingredient" && !ingMap.has(r.componentId)) newIngIds.add(r.componentId);
    }

    if (newSfIds.size > 0) {
      const rows = await tx.select().from(semiFinishedTable).where(and(eq(semiFinishedTable.branchId, sourceBranchId), inArray(semiFinishedTable.id, Array.from(newSfIds))));
      for (const sf of rows) {
        const [existing] = await tx.select().from(semiFinishedTable).where(and(eq(semiFinishedTable.branchId, targetBranchId), eq(semiFinishedTable.name, sf.name)));
        if (existing) {
          if (overwrite) await tx.update(semiFinishedTable).set({ unit: sf.unit, yieldQuantity: sf.yieldQuantity, yieldUnit: sf.yieldUnit, costPricePerUnit: sf.costPricePerUnit, trackInShift: sf.trackInShift }).where(eq(semiFinishedTable.id, existing.id));
          sfMap.set(sf.id, existing.id);
          targetSfIds.add(existing.id);
        } else {
          const [created] = await tx.insert(semiFinishedTable).values({ branchId: targetBranchId, name: sf.name, unit: sf.unit, yieldQuantity: sf.yieldQuantity, yieldUnit: sf.yieldUnit, costPricePerUnit: sf.costPricePerUnit, trackInShift: sf.trackInShift }).returning();
          sfMap.set(sf.id, created.id);
          targetSfIds.add(created.id);
          stats.semiFinished = (stats.semiFinished || 0) + 1;
        }
        const sfRecipes = await tx.select().from(recipesTable).where(and(eq(recipesTable.parentType, "semi_finished"), eq(recipesTable.parentId, sf.id)));
        pendingSfRecipeRows.push(...sfRecipes);
      }
    }

    const allWithPending = [...allRecipeRows, ...pendingSfRecipeRows];
    newIngIds.clear();
    for (const r of allWithPending) {
      if (r.componentType === "ingredient" && !ingMap.has(r.componentId)) newIngIds.add(r.componentId);
    }

    if (newIngIds.size > 0) {
      const rows = await tx.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, sourceBranchId), inArray(ingredientsTable.id, Array.from(newIngIds))));
      for (const ing of rows) {
        const [existing] = await tx.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, targetBranchId), eq(ingredientsTable.name, ing.name)));
        if (existing) {
          if (overwrite) await tx.update(ingredientsTable).set({ unit: ing.unit, costPricePerUnit: ing.costPricePerUnit, minimalStock: ing.minimalStock, trackInShift: ing.trackInShift }).where(eq(ingredientsTable.id, existing.id));
          ingMap.set(ing.id, existing.id);
        } else {
          const [created] = await tx.insert(ingredientsTable).values({ branchId: targetBranchId, name: ing.name, unit: ing.unit, costPricePerUnit: ing.costPricePerUnit, minimalStock: ing.minimalStock, trackInShift: ing.trackInShift }).returning();
          ingMap.set(ing.id, created.id);
          stats.ingredients = (stats.ingredients || 0) + 1;
        }
      }
    }

    if (overwrite) {
      const conds: any[] = [];
      if (targetProductIds.size > 0) conds.push(and(eq(recipesTable.parentType, "product"), inArray(recipesTable.parentId, Array.from(targetProductIds))));
      if (targetVariantIds.size > 0) conds.push(and(eq(recipesTable.parentType, "product_variant"), inArray(recipesTable.parentId, Array.from(targetVariantIds))));
      if (targetSfIds.size > 0) conds.push(and(eq(recipesTable.parentType, "semi_finished"), inArray(recipesTable.parentId, Array.from(targetSfIds))));
      for (const cond of conds) await tx.delete(recipesTable).where(cond);
    }

    let count = 0;
    for (const r of allWithPending) {
      const newParentId = r.parentType === "product" ? prodMap.get(r.parentId) : r.parentType === "product_variant" ? varMap.get(r.parentId) : sfMap.get(r.parentId);
      const newComponentId = r.componentType === "ingredient" ? ingMap.get(r.componentId) : sfMap.get(r.componentId);
      if (!newParentId || !newComponentId) continue;
      await tx.insert(recipesTable).values({ parentType: r.parentType, parentId: newParentId, componentType: r.componentType, componentId: newComponentId, quantity: r.quantity });
      count++;
    }
    stats.recipes = count;
  }

  // 6. Current Inventory
  let invCount = 0;
  for (const entry of [{ map: ingMap, type: "ingredient" }, { map: sfMap, type: "semi_finished" }] as const) {
    if (entry.map.size === 0) continue;
    const oldIds = Array.from(entry.map.keys());
    const srcInv = await tx.select().from(currentInventoryTable).where(and(eq(currentInventoryTable.branchId, sourceBranchId), eq(currentInventoryTable.itemType, entry.type), inArray(currentInventoryTable.itemId, oldIds)));
    for (const inv of srcInv) {
      const newItemId = entry.map.get(inv.itemId);
      if (!newItemId) continue;
      await tx.insert(currentInventoryTable).values({ branchId: targetBranchId, itemType: inv.itemType, itemId: newItemId, currentStock: inv.currentStock })
        .onConflictDoUpdate({ target: [currentInventoryTable.branchId, currentInventoryTable.itemType, currentInventoryTable.itemId], set: { currentStock: inv.currentStock } });
      invCount++;
    }
  }
  stats.inventory = invCount;

  return stats;
}

router.post("/admin/migrate-branch", requireRole("owner", "manager"), async (req, res) => {
  try {
    const { sourceBranchId, targetBranchId, includeIngredients, includeSemiFinished, includeProducts, overwrite } = req.body as {
      sourceBranchId: number;
      targetBranchId: number;
      includeIngredients?: boolean;
      includeSemiFinished?: boolean;
      includeProducts?: boolean;
      overwrite?: boolean;
    };

    if (!sourceBranchId || !targetBranchId) {
      return res.status(400).json({ error: "sourceBranchId and targetBranchId required" });
    }
    if (sourceBranchId === targetBranchId) {
      return res.status(400).json({ error: "Source and target must be different" });
    }
    if (!includeIngredients && !includeSemiFinished && !includeProducts) {
      return res.status(400).json({ error: "Select at least one data type to migrate" });
    }

    const result = await db.transaction((tx) =>
      runMigration(tx, sourceBranchId, targetBranchId, !!includeIngredients, !!includeSemiFinished, !!includeProducts, !!overwrite)
    );

    return res.json({ success: true, stats: result });
  } catch (err: any) {
    console.error("POST /admin/migrate-branch error:", err);
    return res.status(500).json({ error: "Gagal migrasi: " + (err.message || "Unknown error") });
  }
});

export default router;
