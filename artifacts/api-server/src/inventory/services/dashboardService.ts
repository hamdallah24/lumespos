import { db, currentInventoryTable, fifoLayersTable, stockCardTable, warehousesTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { runFullValidation } from "./validationEngine";

export interface InventoryDashboardData {
  totalValue: number;
  totalItems: number;
  byWarehouse: Array<{ warehouseId: number; warehouseName: string; itemCount: number; totalValue: number }>;
  byBranch: Array<{ branchId: number; itemCount: number; totalValue: number }>;
  negativeStockCount: number;
  lowStockCount: number;
  recentMovements: number;
  validationScore: number;
  validationLabel: string;
}

export async function getInventoryDashboard(branchId?: number): Promise<InventoryDashboardData> {
  const valuation = await db
    .select({
      warehouseId: fifoLayersTable.warehouseId,
      value: sql<number>`COALESCE(SUM(${fifoLayersTable.quantity} * ${fifoLayersTable.unitCost}), 0)`,
      items: sql<number>`COUNT(DISTINCT ${fifoLayersTable.itemType} || ':' || ${fifoLayersTable.itemId})`,
    })
    .from(fifoLayersTable)
    .where(
      and(
        sql`${fifoLayersTable.closedAt} IS NULL`,
        sql`${fifoLayersTable.quantity} > 0`,
        branchId ? eq(fifoLayersTable.branchId, branchId) : sql`1=1`,
      ),
    )
    .groupBy(fifoLayersTable.warehouseId);

  const [totalVal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${fifoLayersTable.quantity} * ${fifoLayersTable.unitCost}), 0)` })
    .from(fifoLayersTable)
    .where(
      and(
        sql`${fifoLayersTable.closedAt} IS NULL`,
        sql`${fifoLayersTable.quantity} > 0`,
        branchId ? eq(fifoLayersTable.branchId, branchId) : sql`1=1`,
      ),
    );

  const [negStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      branchId
        ? and(eq(currentInventoryTable.branchId, branchId), sql`${currentInventoryTable.currentStock} < 0`)
        : sql`${currentInventoryTable.currentStock} < 0`,
    );

  // Low stock: items below 10 units (configurable threshold)
  const [lowStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      and(
        sql`${currentInventoryTable.currentStock} > 0 AND ${currentInventoryTable.currentStock} < 10`,
        branchId ? eq(currentInventoryTable.branchId, branchId) : sql`1=1`,
      ),
    );

  const [totalItems] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      and(
        sql`${currentInventoryTable.currentStock} > 0`,
        branchId ? eq(currentInventoryTable.branchId, branchId) : sql`1=1`,
      ),
    );

  const [recentMvmt] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockCardTable)
    .where(
      and(
        sql`${stockCardTable.createdAt} >= NOW() - INTERVAL '24 hours'`,
        branchId ? eq(stockCardTable.branchId, branchId) : sql`1=1`,
      ),
    );

  const whNames = new Map<number, string>();
  const whRows = await db.select({ id: warehousesTable.id, name: warehousesTable.name }).from(warehousesTable);
  for (const w of whRows) whNames.set(w.id, w.name);

  const byWarehouse = valuation.map((v) => ({
    warehouseId: v.warehouseId,
    warehouseName: whNames.get(v.warehouseId) || `Warehouse ${v.warehouseId}`,
    itemCount: v.items,
    totalValue: Math.round(v.value * 100) / 100,
  }));

  const byBranch = await db
    .select({
      branchId: currentInventoryTable.branchId,
      items: sql<number>`count(*)::int`,
      value: sql<number>`COALESCE(SUM(${currentInventoryTable.currentStock} * 0), 0)`,
    })
    .from(currentInventoryTable)
    .where(
      branchId
        ? eq(currentInventoryTable.branchId, branchId)
        : sql`${currentInventoryTable.currentStock} > 0`,
    )
    .groupBy(currentInventoryTable.branchId);

  const validation = await runFullValidation(branchId);

  return {
    totalValue: Math.round((totalVal?.total || 0) * 100) / 100,
    totalItems: totalItems?.count || 0,
    byWarehouse,
    byBranch: byBranch.map((b) => ({ branchId: b.branchId, itemCount: b.items, totalValue: b.value })),
    negativeStockCount: negStock?.count || 0,
    lowStockCount: lowStock?.count || 0,
    recentMovements: recentMvmt?.count || 0,
    validationScore: validation.overallScore,
    validationLabel: validation.overallLabel,
  };
}
