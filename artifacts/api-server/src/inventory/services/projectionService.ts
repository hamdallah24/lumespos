import { db, stockCardTable, currentInventoryTable, fifoLayersTable, warehousesTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

export async function rebuildAllProjections(): Promise<{ currentInventory: number; fifoLayers: number }> {
  // 1. Truncate projections
  await db.delete(currentInventoryTable);
  await db.delete(fifoLayersTable);

  // 2. Rebuild current_inventory from stock_card
  await db.execute(sql`
    INSERT INTO current_inventory (branch_id, warehouse_id, item_type, item_id, current_stock)
    SELECT
      sc.branch_id,
      sc.warehouse_id,
      sc.item_type,
      sc.item_id,
      SUM(sc.qty_change)
    FROM stock_card sc
    GROUP BY sc.branch_id, sc.warehouse_id, sc.item_type, sc.item_id
  `);

  const [ciCount] = await db.select({ count: sql<number>`count(*)::int` }).from(currentInventoryTable);

  // 3. Rebuild FIFO layers from inbound stock_card entries
  const inboundMovements = await db
    .select({
      id: stockCardTable.id,
      branchId: stockCardTable.branchId,
      warehouseId: stockCardTable.warehouseId,
      itemType: stockCardTable.itemType,
      itemId: stockCardTable.itemId,
      qtyAfter: stockCardTable.qtyAfter,
      unitCost: stockCardTable.unitCost,
      createdAt: stockCardTable.createdAt,
      direction: stockCardTable.direction,
      qtyChange: stockCardTable.qtyChange,
      movementType: stockCardTable.movementType,
    })
    .from(stockCardTable)
    .where(eq(stockCardTable.direction, "in"))
    .orderBy(stockCardTable.id);

  for (const row of inboundMovements) {
    if (!row.unitCost || parseFloat(row.unitCost) <= 0) continue;
    const qty = parseFloat(row.qtyChange);
    if (qty <= 0) continue;

    // Check if this was already partially consumed by outbound movements
    const consumedAfter = await db
      .select({ consumed: sql<number>`COALESCE(SUM(${stockCardTable.qtyChange}), 0)` })
      .from(stockCardTable)
      .where(
        sql`${stockCardTable.direction} = 'out'
          AND ${stockCardTable.itemType} = ${row.itemType}
          AND ${stockCardTable.itemId} = ${row.itemId}
          AND ${stockCardTable.branchId} = ${row.branchId}
          AND ${stockCardTable.warehouseId} = ${row.warehouseId}
          AND ${stockCardTable.id} > ${row.id}`
      );

    const consumedQty = Math.abs(consumedAfter[0]?.consumed || 0);
    const remainingQty = Math.max(0, qty - consumedQty);

    if (remainingQty > 0) {
      await db.insert(fifoLayersTable).values({
        branchId: row.branchId,
        warehouseId: row.warehouseId,
        itemType: row.itemType,
        itemId: row.itemId,
        quantity: String(remainingQty),
        unitCost: String(parseFloat(row.unitCost)),
        receivedAt: row.createdAt,
        stockCardId: row.id,
      });
    }
  }

  const [flCount] = await db.select({ count: sql<number>`count(*)::int` }).from(fifoLayersTable);

  return {
    currentInventory: ciCount?.count || 0,
    fifoLayers: flCount?.count || 0,
  };
}
