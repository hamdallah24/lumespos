import {
  db,
  ingredientsTable,
  semiFinishedTable,
  recipesTable,
  currentInventoryTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type ItemType = "ingredient" | "semi_finished";

/** Read the cost_price_per_unit for an item. */
export async function getUnitCost(tx: Executor, itemType: ItemType, itemId: number): Promise<number> {
  if (itemType === "ingredient") {
    const [row] = await tx
      .select({ c: ingredientsTable.costPricePerUnit })
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, itemId));
    return row ? parseFloat(row.c) : 0;
  }
  const [row] = await tx
    .select({ c: semiFinishedTable.costPricePerUnit })
    .from(semiFinishedTable)
    .where(eq(semiFinishedTable.id, itemId));
  return row ? parseFloat(row.c) : 0;
}

/** Upsert current_inventory by delta (can be negative). Returns the new stock level. */
export async function adjustInventory(
  tx: Executor,
  branchId: number,
  itemType: ItemType,
  itemId: number,
  delta: number,
): Promise<number> {
  const [existing] = await tx
    .select()
    .from(currentInventoryTable)
    .where(
      and(
        eq(currentInventoryTable.branchId, branchId),
        eq(currentInventoryTable.itemType, itemType),
        eq(currentInventoryTable.itemId, itemId),
      ),
    );

  if (!existing) {
    const newStock = Math.max(0, delta);
    await tx.insert(currentInventoryTable).values({
      branchId,
      itemType,
      itemId,
      currentStock: String(newStock),
    });
    return newStock;
  }

  const newStock = Math.max(0, parseFloat(existing.currentStock) + delta);
  await tx
    .update(currentInventoryTable)
    .set({ currentStock: String(newStock) })
    .where(eq(currentInventoryTable.id, existing.id));
  return newStock;
}

export async function getInventoryStock(
  tx: Executor,
  branchId: number,
  itemType: ItemType,
  itemId: number,
): Promise<number> {
  const [row] = await tx
    .select({ s: currentInventoryTable.currentStock })
    .from(currentInventoryTable)
    .where(
      and(
        eq(currentInventoryTable.branchId, branchId),
        eq(currentInventoryTable.itemType, itemType),
        eq(currentInventoryTable.itemId, itemId),
      ),
    );
  return row ? parseFloat(row.s) : 0;
}

/**
 * Moving average for raw materials on stock-in.
 * new_cost = ((oldStock * oldPrice) + purchaseTotal) / (oldStock + newQty)
 */
export async function applyMovingAverage(
  tx: Executor,
  branchId: number,
  ingredientId: number,
  newQty: number,
  purchaseTotal: number,
): Promise<number> {
  const [ing] = await tx
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.id, ingredientId));
  if (!ing) return 0;

  const oldStock = await getInventoryStock(tx, branchId, "ingredient", ingredientId);
  const oldPrice = parseFloat(ing.costPricePerUnit);
  const denom = oldStock + newQty;
  const newCost = denom > 0 ? (oldStock * oldPrice + purchaseTotal) / denom : oldPrice;

  await tx
    .update(ingredientsTable)
    .set({ costPricePerUnit: String(newCost) })
    .where(eq(ingredientsTable.id, ingredientId));

  return newCost;
}

export type RecipeRow = {
  componentType: ItemType;
  componentId: number;
  quantity: number;
};

// ============================================================
// FUNGSI getRecipeRows YANG SUDAH DIPERBAIKI
// ============================================================
export async function getRecipeRows(
  tx: Executor,
  parentType: "product" | "semi_finished" | "product_variant",
  parentId: number,
): Promise<RecipeRow[]> {
  const rows = await tx
    .select()
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.parentType, parentType),
        eq(recipesTable.parentId, parentId)
      )
    );
  
  console.log(`[getRecipeRows] ${parentType}:${parentId} -> found ${rows.length} rows`);
  
  return rows.map((r) => ({
    componentType: r.componentType as ItemType,
    componentId: r.componentId,
    quantity: parseFloat(r.quantity),
  }));
}

/**
 * COGS for one unit of a parent = sum(component unit cost * recipe qty).
 */
export async function computeUnitCogs(
  tx: Executor,
  parentType: "product" | "semi_finished" | "product_variant",
  parentId: number,
): Promise<number> {
  const rows = await getRecipeRows(tx, parentType, parentId);
  let cost = 0;
  for (const r of rows) {
    const unitCost = await getUnitCost(tx, r.componentType, r.componentId);
    cost += unitCost * r.quantity;
  }
  return cost;
}

/**
 * Deduct direct recipe components for selling `qty` of a product or product variant.
 * Returns total COGS of the deducted components.
 */
export async function deductForProduct(
  tx: Executor,
  branchId: number,
  productId: number,
  qty: number,
  productVariantId?: number | null,
): Promise<number> {
  let rows: RecipeRow[] = [];

  if (productVariantId) {
    rows = await getRecipeRows(tx, "product_variant", productVariantId);
  }

  if (rows.length === 0) {
    rows = await getRecipeRows(tx, "product", productId);
  }

  let cogs = 0;
  for (const r of rows) {
    const deductQty = r.quantity * qty;
    const unitCost = await getUnitCost(tx, r.componentType, r.componentId);
    cogs += unitCost * deductQty;
    await adjustInventory(tx, branchId, r.componentType, r.componentId, -deductQty);
  }
  return cogs;
}

export const LOW_STOCK_DEFAULT = 200;

/** Build a combined inventory list (ingredients + semi-finished) for a branch. */
export async function listInventoryForBranch(branchId: number) {
  const ingredients = await db
    .select({
      itemId: ingredientsTable.id,
      name: ingredientsTable.name,
      unit: ingredientsTable.unit,
      minimalStock: ingredientsTable.minimalStock,
      costPricePerUnit: ingredientsTable.costPricePerUnit,
      trackInShift: ingredientsTable.trackInShift,
      currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
    })
    .from(ingredientsTable)
    .leftJoin(
      currentInventoryTable,
      and(
        eq(currentInventoryTable.itemType, sql`'ingredient'`),
        eq(currentInventoryTable.itemId, ingredientsTable.id),
        eq(currentInventoryTable.branchId, branchId),
      ),
    )
    .where(eq(ingredientsTable.branchId, branchId));

  const semi = await db
    .select({
      itemId: semiFinishedTable.id,
      name: semiFinishedTable.name,
      unit: semiFinishedTable.unit,
      costPricePerUnit: semiFinishedTable.costPricePerUnit,
      trackInShift: semiFinishedTable.trackInShift,
      currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
    })
    .from(semiFinishedTable)
    .leftJoin(
      currentInventoryTable,
      and(
        eq(currentInventoryTable.itemType, sql`'semi_finished'`),
        eq(currentInventoryTable.itemId, semiFinishedTable.id),
        eq(currentInventoryTable.branchId, branchId),
      ),
    )
    .where(eq(semiFinishedTable.branchId, branchId));

  return [
    ...ingredients.map((r) => ({
      itemType: "ingredient" as const,
      itemId: r.itemId,
      name: r.name,
      unit: r.unit,
      currentStock: parseFloat(r.currentStock),
      minimalStock: parseFloat(r.minimalStock),
      costPricePerUnit: parseFloat(r.costPricePerUnit),
      trackInShift: r.trackInShift,
    })),
    ...semi.map((r) => ({
      itemType: "semi_finished" as const,
      itemId: r.itemId,
      name: r.name,
      unit: r.unit,
      currentStock: parseFloat(r.currentStock),
      minimalStock: null,
      costPricePerUnit: parseFloat(r.costPricePerUnit),
      trackInShift: r.trackInShift,
    })),
  ];
}

/** Same as listInventoryForBranch but only returns items with trackInShift = true. */
export async function listInventoryForShift(branchId: number) {
  const all = await listInventoryForBranch(branchId);
  return all.filter((item) => item.trackInShift === true);
}