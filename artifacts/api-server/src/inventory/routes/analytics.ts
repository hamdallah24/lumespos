import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { db, stockCardTable, fifoLayersTable, currentInventoryTable, itemsTable, warehousesTable, ingredientsTable, semiFinishedTable, productsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, asc, sql, isNull, inArray } from "drizzle-orm";

const router = Router();

// ── Consolidated Analytics ──

router.get("/inventory/analytics", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const days = Number(req.query["days"]) || 90;

    const since = new Date(Date.now() - days * 86400000).toISOString();

    // ─── 1. Current inventory snapshot ───
    const currentInv = await db.select({
      itemType: currentInventoryTable.itemType,
      itemId: currentInventoryTable.itemId,
      warehouseId: currentInventoryTable.warehouseId,
      currentStock: currentInventoryTable.currentStock,
    }).from(currentInventoryTable).where(eq(currentInventoryTable.branchId, branchId));

    // ─── 2. Active FIFO layers for valuation ───
    const activeLayers = await db.select({
      itemType: fifoLayersTable.itemType,
      itemId: fifoLayersTable.itemId,
      warehouseId: fifoLayersTable.warehouseId,
      quantity: fifoLayersTable.quantity,
      unitCost: fifoLayersTable.unitCost,
      receivedAt: fifoLayersTable.receivedAt,
    }).from(fifoLayersTable).where(
      and(eq(fifoLayersTable.branchId, branchId), isNull(fifoLayersTable.closedAt))
    );

    // ─── 3. Movement summary (outbound) for velocity ───
    const movements = await db.select({
      itemType: stockCardTable.itemType,
      itemId: stockCardTable.itemId,
      direction: stockCardTable.direction,
      qtyChange: stockCardTable.qtyChange,
      createdAt: stockCardTable.createdAt,
    }).from(stockCardTable).where(
      and(eq(stockCardTable.branchId, branchId), gte(stockCardTable.createdAt, new Date(since)))
    );

    // ─── 4. All stock card entries for dead stock detection ───
    const lastMovements = await db.select({
      itemType: stockCardTable.itemType,
      itemId: stockCardTable.itemId,
      lastDate: sql<string>`MAX(${stockCardTable.createdAt})`,
    }).from(stockCardTable).where(eq(stockCardTable.branchId, branchId))
      .groupBy(stockCardTable.itemType, stockCardTable.itemId);

    const lastMoveMap = new Map<string, string>();
    for (const m of lastMovements) lastMoveMap.set(`${m.itemType}:${m.itemId}`, m.lastDate);

    // ─── Build item valuation map ───
    const itemValueMap = new Map<string, { totalValue: number; totalQty: number; avgCost: number; oldestDays: number }>();
    for (const l of activeLayers) {
      const key = `${l.itemType}:${l.itemId}`;
      if (!itemValueMap.has(key)) itemValueMap.set(key, { totalValue: 0, totalQty: 0, avgCost: 0, oldestDays: 0 });
      const e = itemValueMap.get(key)!;
      const qty = Number(l.quantity);
      const cost = Number(l.unitCost);
      e.totalQty += qty;
      e.totalValue += qty * cost;
      const ageDays = (Date.now() - new Date(l.receivedAt).getTime()) / 86400000;
      if (ageDays > e.oldestDays) e.oldestDays = ageDays;
    }
    for (const [key, e] of itemValueMap) e.avgCost = e.totalQty > 0 ? e.totalValue / e.totalQty : 0;

    // ─── Build consumption map ───
    const consumptionMap = new Map<string, number>();
    for (const m of movements) {
      if (m.direction === "out") {
        const key = `${m.itemType}:${m.itemId}`;
        consumptionMap.set(key, (consumptionMap.get(key) || 0) + Number(m.qtyChange));
      }
    }

    // ─── Enrich with item names ───
    const allKeys = [...new Set([...itemValueMap.keys(), ...consumptionMap.keys(), ...currentInv.map(i => `${i.itemType}:${i.itemId}`)])];
    const nameMap = new Map<string, string>();

    const typeGroups = new Map<string, number[]>();
    for (const k of allKeys) {
      const [type, idStr] = k.split(":");
      if (!typeGroups.has(type)) typeGroups.set(type, []);
      typeGroups.get(type)!.push(Number(idStr));
    }
    for (const [type, ids] of typeGroups) {
      const uniqueIds = [...new Set(ids)];
      if (["item", "raw_material", "finished_good", "semi_finished"].includes(type)) {
        const rows = await db.select({ id: itemsTable.id, name: itemsTable.name }).from(itemsTable).where(inArray(itemsTable.id, uniqueIds));
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "ingredient") {
        const rows = await db.select({ id: ingredientsTable.id, name: ingredientsTable.name }).from(ingredientsTable).where(inArray(ingredientsTable.id, uniqueIds));
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "semi_finished") {
        const rows = await db.select({ id: semiFinishedTable.id, name: semiFinishedTable.name }).from(semiFinishedTable).where(inArray(semiFinishedTable.id, uniqueIds));
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      } else if (type === "product") {
        const rows = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, uniqueIds));
        for (const r of rows) nameMap.set(`${type}:${r.id}`, r.name);
      }
    }

    // ─── ABC Analysis ───
    const abcItems = [...itemValueMap.entries()]
      .map(([key, v]) => ({ key, name: nameMap.get(key) || `#${key.split(":")[1]}`, totalValue: v.totalValue, totalQty: v.totalQty }))
      .sort((a, b) => b.totalValue - a.totalValue);
    const totalInvValue = abcItems.reduce((s, i) => s + i.totalValue, 0);
    let cumPct = 0;
    const abcResult = abcItems.map(i => {
      cumPct += totalInvValue > 0 ? (i.totalValue / totalInvValue) * 100 : 0;
      return { ...i, cumPct: Math.round(cumPct * 100) / 100, category: cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C" };
    });

    // ─── Slow / Fast Moving ───
    const movingItems = allKeys.map(key => {
      const cons = consumptionMap.get(key) || 0;
      const dailyRate = cons / days;
      const stock = itemValueMap.get(key)?.totalQty || 0;
      const turnover = dailyRate > 0 ? stock / dailyRate : 999;
      return { key, name: nameMap.get(key) || `#${key.split(":")[1]}`, dailyRate, currentStock: stock, turnoverDays: turnover,
        classification: turnover >= 90 ? "dead" : turnover >= 60 ? "slow" : turnover <= 7 ? "fast" : "normal" };
    });

    // ─── Dead Stock ───
    const now = new Date();
    const deadStockItems = movingItems.filter(i => {
      const lm = lastMoveMap.get(i.key);
      if (!lm) return true;
      const daysSinceMove = (now.getTime() - new Date(lm).getTime()) / 86400000;
      return daysSinceMove > 90 && i.currentStock > 0;
    });

    // ─── Turnover ───
    const totalOutQty = movements.filter(m => m.direction === "out").reduce((s, m) => s + Number(m.qtyChange), 0);
    const totalOutValue = movements.filter(m => m.direction === "out").reduce((s, m) => s + Number(m.qtyChange) * (itemValueMap.get(`${m.itemType}:${m.itemId}`)?.avgCost || 0), 0);
    const avgInventoryValue = totalInvValue; // simplified
    const turnoverRatio = avgInventoryValue > 0 ? totalOutValue / avgInventoryValue : 0;

    // ─── Forecast (next 30 days consumption based on moving average) ───
    const forecasts = movingItems.filter(i => i.dailyRate > 0).map(i => ({
      key: i.key, name: i.name, dailyRate: i.dailyRate,
      forecast30: i.dailyRate * 30,
      currentStock: i.currentStock,
      daysUntilOut: i.dailyRate > 0 ? i.currentStock / i.dailyRate : 0,
    })).sort((a, b) => a.daysUntilOut - b.daysUntilOut);

    // ─── Smart Reorder ───
    const itemsData = await db.select({
      id: itemsTable.id, code: itemsTable.code, name: itemsTable.name,
      type: itemsTable.type, reorderPoint: itemsTable.reorderPoint,
      minStock: itemsTable.minStock, maxStock: itemsTable.maxStock,
      leadTime: itemsTable.leadTime, safetyStock: itemsTable.safetyStock,
      purchasePrice: itemsTable.purchasePrice, isActive: itemsTable.isActive,
    }).from(itemsTable).where(and(eq(itemsTable.branchId, branchId), eq(itemsTable.isActive, true), eq(itemsTable.type, "raw_material")));

    const reorderSuggestions = itemsData.map(item => {
      const key = `item:${item.id}`;
      const cons = consumptionMap.get(key) || 0;
      const dailyRate = cons / Math.max(days, 1);
      const stock = itemValueMap.get(key)?.totalQty || 0;
      const leadTime = item.leadTime || 0;
      const safetyStock = Number(item.safetyStock || 0);
      const reorderPoint = Number(item.reorderPoint || 0);
      const maxStock = Number(item.maxStock || 0);
      const computedReorderPoint = dailyRate * leadTime + safetyStock;
      const effectiveReorderPoint = reorderPoint > 0 ? reorderPoint : computedReorderPoint;
      const needsReorder = stock <= effectiveReorderPoint;
      const suggestedQty = Math.max(maxStock - stock, (dailyRate * leadTime * 2) || 0);
      return {
        itemId: item.id, code: item.code, name: item.name,
        currentStock: stock, dailyRate: Math.round(dailyRate * 100) / 100,
        leadTime, safetyStock: Number(safetyStock), reorderPoint: effectiveReorderPoint,
        needsReorder, suggestedQty: Math.ceil(suggestedQty),
        stockStatus: stock <= 0 ? "out_of_stock" : stock <= effectiveReorderPoint ? "low" : "adequate",
      };
    }).filter(i => i.needsReorder || i.stockStatus !== "adequate");

    return res.json({
      abc: { items: abcResult.slice(0, 50), totalValue: totalInvValue, aCount: abcResult.filter(i => i.category === "A").length, bCount: abcResult.filter(i => i.category === "B").length, cCount: abcResult.filter(i => i.category === "C").length },
      movement: { items: movingItems.filter(i => i.currentStock > 0).sort((a, b) => b.dailyRate - a.dailyRate).slice(0, 50), fastCount: movingItems.filter(i => i.classification === "fast").length, slowCount: movingItems.filter(i => i.classification === "slow").length, deadCount: deadStockItems.length },
      deadStock: deadStockItems.sort((a, b) => a.turnoverDays - b.turnoverDays).slice(0, 30),
      turnover: { ratio: Math.round(turnoverRatio * 100) / 100, totalOutValue, avgInventoryValue, days: days },
      forecast: forecasts.slice(0, 30),
      reorder: reorderSuggestions.slice(0, 30),
      summary: {
        totalItems: allKeys.length, totalValue: totalInvValue,
        totalQty: currentInv.reduce((s, i) => s + Number(i.currentStock), 0),
        deadStockCount: deadStockItems.length,
        reorderCount: reorderSuggestions.filter(i => i.needsReorder).length,
        lowStockCount: reorderSuggestions.filter(i => i.stockStatus === "low").length,
        outOfStockCount: reorderSuggestions.filter(i => i.stockStatus === "out_of_stock").length,
      },
    });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;