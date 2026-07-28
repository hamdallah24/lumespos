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

export type RecipeRow = {
  componentType: ItemType;
  componentId: number;
  quantity: number;
};

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
  
  return rows.map((r) => ({
    componentType: r.componentType as ItemType,
    componentId: r.componentId,
    quantity: parseFloat(r.quantity),
  }));
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