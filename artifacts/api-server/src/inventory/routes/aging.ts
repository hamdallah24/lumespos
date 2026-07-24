import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { db, fifoLayersTable, warehousesTable, itemsTable, ingredientsTable, semiFinishedTable, productsTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";

const router = Router();

router.get("/inventory/aging", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const warehouseId = req.query["warehouseId"] ? Number(req.query["warehouseId"]) : undefined;
    const itemType = req.query["itemType"] ? String(req.query["itemType"]) : undefined;

    const conditions = [eq(fifoLayersTable.branchId, branchId), isNull(fifoLayersTable.closedAt)];
    if (warehouseId) conditions.push(eq(fifoLayersTable.warehouseId, warehouseId));
    if (itemType) conditions.push(eq(fifoLayersTable.itemType, itemType));

    let layers = await db.select({
      id: fifoLayersTable.id,
      itemType: fifoLayersTable.itemType,
      itemId: fifoLayersTable.itemId,
      warehouseId: fifoLayersTable.warehouseId,
      quantity: fifoLayersTable.quantity,
      unitCost: fifoLayersTable.unitCost,
      receivedAt: fifoLayersTable.receivedAt,
      totalValue: sql<string>`CAST(${fifoLayersTable.quantity} * ${fifoLayersTable.unitCost} AS numeric(14,2))`,
      ageDays: sql<number>`EXTRACT(DAY FROM NOW() - ${fifoLayersTable.receivedAt})::int`,
    }).from(fifoLayersTable).where(and(...conditions)).orderBy(fifoLayersTable.receivedAt);

    // Enrich with item names and warehouse names
    const whIds = [...new Set(layers.map(l => l.warehouseId))];
    const whRows = await db.select({ id: warehousesTable.id, name: warehousesTable.name }).from(warehousesTable).where(sql`${warehousesTable.id} = ANY(${whIds})`);
    const whMap = new Map(whRows.map(w => [w.id, w.name]));

    // Get names from items master, ingredients, semi_finished, products
    const itemTypes = [...new Set(layers.map(l => l.itemType))];
    const itemIdsByType = new Map<string, number[]>();
    for (const l of layers) {
      if (!itemIdsByType.has(l.itemType)) itemIdsByType.set(l.itemType, []);
      itemIdsByType.get(l.itemType)!.push(l.itemId);
    }

    const nameMap = new Map<string, string>();
    for (const [type, ids] of itemIdsByType) {
      const uniqueIds = [...new Set(ids)];
      if (type === "item" || type === "raw_material" || type === "finished_good" || type === "semi_finished") {
        const rows = await db.select({ id: itemsTable.id, name: itemsTable.name }).from(itemsTable).where(sql`${itemsTable.id} = ANY(${uniqueIds})`);
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "ingredient") {
        const rows = await db.select({ id: ingredientsTable.id, name: ingredientsTable.name }).from(ingredientsTable).where(sql`${ingredientsTable.id} = ANY(${uniqueIds})`);
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "semi_finished") {
        const rows = await db.select({ id: semiFinishedTable.id, name: semiFinishedTable.name }).from(semiFinishedTable).where(sql`${semiFinishedTable.id} = ANY(${uniqueIds})`);
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "product") {
        const rows = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(sql`${productsTable.id} = ANY(${uniqueIds})`);
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      }
    }

    // Build response
    const enriched = layers.map(l => ({
      ...l,
      warehouseName: whMap.get(l.warehouseId) || `WH #${l.warehouseId}`,
      itemName: nameMap.get(`${l.itemType}:${l.itemId}`) || `#${l.itemId}`,
      bucket: getBucket(l.ageDays),
    }));

    // Bucket summary
    const buckets: Record<string, { totalQty: number; totalValue: number; count: number }> = {
      "0-30": { totalQty: 0, totalValue: 0, count: 0 },
      "31-60": { totalQty: 0, totalValue: 0, count: 0 },
      "61-90": { totalQty: 0, totalValue: 0, count: 0 },
      "91-180": { totalQty: 0, totalValue: 0, count: 0 },
      ">180": { totalQty: 0, totalValue: 0, count: 0 },
    };
    let totalValue = 0;
    for (const l of enriched) {
      const qty = Number(l.quantity);
      const val = Number(l.totalValue);
      const b = buckets[l.bucket];
      if (b) { b.totalQty += qty; b.totalValue += val; b.count++; }
      totalValue += val;
    }

    // Aging items (90+ days) for alerting
    const agingItems = enriched.filter(l => l.ageDays >= 90).sort((a, b) => b.ageDays - a.ageDays);

    return res.json({
      layers: enriched,
      buckets,
      summary: {
        totalLayers: enriched.length,
        totalValue,
        agingItemCount: agingItems.length,
        agingValue: agingItems.reduce((s, l) => s + Number(l.totalValue), 0),
        oldestAgeDays: enriched.length > 0 ? Math.max(...enriched.map(l => l.ageDays)) : 0,
      },
      agingItems: agingItems.slice(0, 20),
    });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

function getBucket(ageDays: number): string {
  if (ageDays <= 30) return "0-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays <= 90) return "61-90";
  if (ageDays <= 180) return "91-180";
  return ">180";
}

export default router;