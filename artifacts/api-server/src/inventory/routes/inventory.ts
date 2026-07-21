import { Router } from "express";
import { requireAuth, requireBranchAccess } from "../../middlewares/requireAuth";
import { createMovement } from "../services/movementService";
import { rebuildAllProjections } from "../services/projectionService";
import { getFifoValuation } from "../services/fifoCostingService";
import { runFullValidation } from "../services/validationEngine";
import { getInventoryDashboard } from "../services/dashboardService";
import { db, stockCardTable, warehousesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/inventory/movements", requireAuth, async (req, res) => {
  try {
    const {
      branchId, warehouseId, itemType, itemId, movementType,
      quantity, unitCost, referenceType, referenceId, batchId, description,
    } = req.body;

    if (!branchId || !itemType || !itemId || !movementType || !quantity) {
      return res.status(400).json({ error: "branchId, itemType, itemId, movementType, quantity required" });
    }

    const result = await createMovement({
      branchId: Number(branchId),
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      itemType: String(itemType),
      itemId: Number(itemId),
      movementType: String(movementType) as any,
      quantity: Number(quantity),
      unitCost: unitCost ? Number(unitCost) : undefined,
      referenceType: referenceType ? String(referenceType) : undefined,
      referenceId: referenceId ? Number(referenceId) : undefined,
      batchId: batchId ? String(batchId) : undefined,
      description: description ? String(description) : undefined,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/inventory/rebuild-projections", requireAuth, async (_req, res) => {
  try {
    const result = await rebuildAllProjections();
    return res.json({
      message: "Projections rebuilt",
      currentInventoryRows: result.currentInventory,
      fifoLayerRows: result.fifoLayers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/valuation", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const warehouseId = req.query["warehouseId"] ? Number(req.query["warehouseId"]) : undefined;
    if (!branchId) return res.status(400).json({ error: "branchId required" });
    const valuation = await getFifoValuation(branchId, warehouseId);
    return res.json(valuation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/validation", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const report = await runFullValidation(branchId);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/dashboard", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const dashboard = await getInventoryDashboard(branchId);
    return res.json(dashboard);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/recent-movements", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const rows = await db
      .select({
        id: stockCardTable.id,
        movementType: stockCardTable.movementType,
        direction: stockCardTable.direction,
        qtyChange: stockCardTable.qtyChange,
        qtyAfter: stockCardTable.qtyAfter,
        unitCost: stockCardTable.unitCost,
        description: stockCardTable.description,
        referenceType: stockCardTable.referenceType,
        referenceId: stockCardTable.referenceId,
        itemType: stockCardTable.itemType,
        itemId: stockCardTable.itemId,
        warehouseId: stockCardTable.warehouseId,
        warehouseName: warehousesTable.name,
        createdAt: stockCardTable.createdAt,
      })
      .from(stockCardTable)
      .leftJoin(warehousesTable, eq(stockCardTable.warehouseId, warehousesTable.id))
      .orderBy(desc(stockCardTable.createdAt))
      .limit(limit);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
