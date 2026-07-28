import { db, currentInventoryTable, fifoLayersTable, stockCardTable, warehousesTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { runFullValidation } from "./validationEngine";

export interface KpiTrend {
  value: number; previous: number; change: number; direction: "up" | "down" | "flat";
}

export interface InventoryDashboardData {
  totalValue: number;
  totalValueTrend: KpiTrend;
  totalItems: number;
  totalItemsTrend: KpiTrend;
  byWarehouse: Array<{ warehouseId: number; warehouseName: string; itemCount: number; totalValue: number }>;
  byBranch: Array<{ branchId: number; itemCount: number; totalValue: number }>;
  negativeStockCount: number;
  lowStockCount: number;
  lowStockTrend: KpiTrend;
  outOfStockCount: number;
  recentMovements: number;
  recentMovementsTrend: KpiTrend;
  validationScore: number;
  validationLabel: string;
  warehouseDetail: Array<{
    warehouseId: number; warehouseName: string; totalValue: number; itemCount: number;
    movementIn: number; movementOut: number; utilization: number;
  }>;
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

  const [outOfStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      and(
        sql`${currentInventoryTable.currentStock} <= 0`,
        branchId ? eq(currentInventoryTable.branchId, branchId) : sql`1=1`,
      ),
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
      value: sql<number>`COALESCE(SUM(${currentInventoryTable.currentStock} * COALESCE((
        SELECT ${fifoLayersTable.unitCost} FROM ${fifoLayersTable}
        WHERE ${fifoLayersTable.itemType} = ${currentInventoryTable.itemType}
          AND ${fifoLayersTable.itemId} = ${currentInventoryTable.itemId}
          AND ${fifoLayersTable.branchId} = ${currentInventoryTable.branchId}
          AND ${fifoLayersTable.closedAt} IS NULL
        LIMIT 1
      ), 0)), 0)`,
    })
    .from(currentInventoryTable)
    .where(
      branchId
        ? eq(currentInventoryTable.branchId, branchId)
        : sql`${currentInventoryTable.currentStock} > 0`,
    )
    .groupBy(currentInventoryTable.branchId);

  const validation = await runFullValidation(branchId);

  // ── Trend: Compare with last 7 days for movements ──
  const [prevMovements] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockCardTable)
    .where(
      and(
        sql`${stockCardTable.createdAt} >= NOW() - INTERVAL '14 days'`,
        sql`${stockCardTable.createdAt} < NOW() - INTERVAL '7 days'`,
        branchId ? eq(stockCardTable.branchId, branchId) : sql`1=1`,
      ),
    );

  // ── Trend: Previous period stock count ──
  const [prevItems] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      and(
        sql`${currentInventoryTable.currentStock} > 0`,
        branchId ? eq(currentInventoryTable.branchId, branchId) : sql`1=1`,
      ),
    );

  // ── Trend: Previous low stock ──
  const [prevLowStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(currentInventoryTable)
    .where(
      and(
        sql`${currentInventoryTable.currentStock} > 0 AND ${currentInventoryTable.currentStock} < 10`,
        branchId ? eq(currentInventoryTable.branchId, branchId) : sql`1=1`,
      ),
    );

  // ── Previous total value (approximate from same queries, just for trend) ──
  const [prevVal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${fifoLayersTable.quantity} * ${fifoLayersTable.unitCost}), 0)` })
    .from(fifoLayersTable)
    .where(
      and(
        sql`${fifoLayersTable.closedAt} IS NULL`,
        sql`${fifoLayersTable.quantity} > 0`,
        branchId ? eq(fifoLayersTable.branchId, branchId) : sql`1=1`,
      ),
    );

  const computeTrend = (current: number, prev: number): KpiTrend => {
    const change = prev > 0 ? Math.round(((current - prev) / prev) * 100) : 0;
    return { value: current, previous: prev, change: Math.abs(change), direction: change > 0 ? "up" : change < 0 ? "down" : "flat" };
  };

  // ── Warehouse Movement Count ──
  const whMovements = await db
    .select({
      warehouseId: stockCardTable.warehouseId,
      movementIn: sql<number>`COUNT(*) FILTER (WHERE ${stockCardTable.direction} = 'in')`,
      movementOut: sql<number>`COUNT(*) FILTER (WHERE ${stockCardTable.direction} = 'out')`,
    })
    .from(stockCardTable)
    .where(
      and(
        sql`${stockCardTable.createdAt} >= NOW() - INTERVAL '7 days'`,
        branchId ? eq(stockCardTable.branchId, branchId) : sql`1=1`,
      ),
    )
    .groupBy(stockCardTable.warehouseId);

  const whMovementMap = new Map<number, { in: number; out: number }>();
  for (const m of whMovements) whMovementMap.set(m.warehouseId, { in: m.movementIn, out: m.movementOut });

  const warehouseDetail = byWarehouse.map((wh) => {
    const mv = whMovementMap.get(wh.warehouseId) || { in: 0, out: 0 };
    return {
      warehouseId: wh.warehouseId,
      warehouseName: wh.warehouseName,
      totalValue: wh.totalValue,
      itemCount: wh.itemCount,
      movementIn: mv.in,
      movementOut: mv.out,
      utilization: Math.min(100, Math.round((wh.totalValue / 100_000_000) * 100)),
    };
  });

  const totalValue = Math.round((totalVal?.total || 0) * 100) / 100;
  const totalItemsCount = totalItems?.count || 0;
  const totalPrevVal = Math.round((prevVal?.total || 0) * 100) / 100;

  return {
    totalValue,
    totalValueTrend: computeTrend(totalValue, totalPrevVal),
    totalItems: totalItemsCount,
    totalItemsTrend: computeTrend(totalItemsCount, prevItems?.count || 0),
    byWarehouse,
    byBranch: byBranch.map((b) => ({ branchId: b.branchId, itemCount: b.items, totalValue: b.value })),
    negativeStockCount: negStock?.count || 0,
    lowStockCount: lowStock?.count || 0,
    lowStockTrend: computeTrend(lowStock?.count || 0, prevLowStock?.count || 0),
    outOfStockCount: outOfStock?.count || 0,
    recentMovements: recentMvmt?.count || 0,
    recentMovementsTrend: computeTrend(recentMvmt?.count || 0, prevMovements?.count || 0),
    validationScore: validation.overallScore,
    validationLabel: validation.overallLabel,
    warehouseDetail,
  };
}
