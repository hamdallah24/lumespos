import { db, fifoLayersTable, ingredientsTable, semiFinishedTable, productsTable, itemsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface FifoConsumptionResult {
  consumedLayers: Array<{ layerId: number; qty: number; unitCost: number; totalCost: number }>;
  totalCost: number;
}

export async function createFifoLayer(
  tx: any,
  branchId: number,
  warehouseId: number,
  itemType: string,
  itemId: number,
  quantity: number,
  unitCost: number,
  stockCardId: number,
): Promise<void> {
  await tx.insert(fifoLayersTable).values({
    branchId,
    warehouseId,
    itemType,
    itemId,
    quantity: String(quantity),
    unitCost: String(unitCost),
    receivedAt: new Date(),
    stockCardId,
  });
}

export async function consumeFifo(
  tx: any,
  branchId: number,
  warehouseId: number,
  itemType: string,
  itemId: number,
  neededQty: number,
): Promise<FifoConsumptionResult> {
  const openLayers = await tx
    .select()
    .from(fifoLayersTable)
    .where(
      and(
        eq(fifoLayersTable.branchId, branchId),
        eq(fifoLayersTable.warehouseId, warehouseId),
        eq(fifoLayersTable.itemType, itemType),
        eq(fifoLayersTable.itemId, itemId),
        sql`${fifoLayersTable.closedAt} IS NULL`,
        sql`${fifoLayersTable.quantity} > 0`,
      ),
    )
    .orderBy(fifoLayersTable.receivedAt);

  let remaining = neededQty;
  const consumedLayers: FifoConsumptionResult["consumedLayers"] = [];
  let totalCost = 0;

  for (const layer of openLayers) {
    if (remaining <= 0) break;
    const layerQty = parseFloat(layer.quantity);
    const consumeQty = Math.min(layerQty, remaining);
    const layerUnitCost = parseFloat(layer.unitCost);
    const layerCost = consumeQty * layerUnitCost;

    const newQty = layerQty - consumeQty;
    await tx
      .update(fifoLayersTable)
      .set({
        quantity: String(newQty),
        closedAt: newQty <= 0 ? new Date() : null,
      })
      .where(eq(fifoLayersTable.id, layer.id));

    consumedLayers.push({
      layerId: layer.id,
      qty: consumeQty,
      unitCost: layerUnitCost,
      totalCost: Math.round(layerCost * 100) / 100,
    });
    totalCost += layerCost;
    remaining -= consumeQty;
  }

  return {
    consumedLayers,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export async function getFifoValuation(
  branchId: number,
  warehouseId?: number,
): Promise<{ itemType: string; itemId: number; itemName: string; quantity: number; unitCost: number; totalValue: number }[]> {
  const where = eq(fifoLayersTable.branchId, branchId);
  const w = warehouseId ? and(where, eq(fifoLayersTable.warehouseId, warehouseId)) : where;

  const layers = await db
    .select()
    .from(fifoLayersTable)
    .where(and(w, sql`${fifoLayersTable.closedAt} IS NULL`, sql`${fifoLayersTable.quantity} > 0`));

  const grouped = new Map<string, { qty: number; value: number; unitCost: number }>();
  for (const layer of layers) {
    const key = `${layer.itemType}:${layer.itemId}`;
    const qty = parseFloat(layer.quantity);
    const cost = parseFloat(layer.unitCost);
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += qty;
      existing.value += qty * cost;
      existing.unitCost = existing.value / existing.qty;
    } else {
      grouped.set(key, { qty, value: qty * cost, unitCost: cost });
    }
  }

  let result = Array.from(grouped.entries()).map(([key, val]) => {
    const [itemType, itemIdStr] = key.split(":");
    return {
      itemType,
      itemId: parseInt(itemIdStr),
      quantity: Math.round(val.qty * 10000) / 10000,
      unitCost: Math.round(val.unitCost * 100) / 100,
      totalValue: Math.round(val.value * 100) / 100,
    };
  });

  // Resolve item names from source tables
  const nameMap = new Map<string, string>();
  const byType: Record<string, number[]> = {};
  for (const r of result) {
    if (!byType[r.itemType]) byType[r.itemType] = [];
    byType[r.itemType].push(r.itemId);
  }
  if (byType["ingredient"]?.length) {
    const rows = await db.select({ id: ingredientsTable.id, name: ingredientsTable.name }).from(ingredientsTable).where(inArray(ingredientsTable.id, byType["ingredient"]));
    for (const r of rows) nameMap.set(`ingredient:${r.id}`, r.name);
  }
  if (byType["semi_finished"]?.length) {
    const rows = await db.select({ id: semiFinishedTable.id, name: semiFinishedTable.name }).from(semiFinishedTable).where(inArray(semiFinishedTable.id, byType["semi_finished"]));
    for (const r of rows) nameMap.set(`semi_finished:${r.id}`, r.name);
  }
  if (byType["product"]?.length) {
    const rows = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, byType["product"]));
    for (const r of rows) nameMap.set(`product:${r.id}`, r.name);
  }
  if (byType["item"]?.length) {
    const rows = await db.select({ id: itemsTable.id, name: itemsTable.name }).from(itemsTable).where(inArray(itemsTable.id, byType["item"]));
    for (const r of rows) nameMap.set(`item:${r.id}`, r.name);
  }

  result = result.map(r => ({
    ...r,
    itemName: nameMap.get(`${r.itemType}:${r.itemId}`) || `${r.itemType} #${r.itemId}`,
  }));

  return result;
}
