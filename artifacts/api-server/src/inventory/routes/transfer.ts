import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createTransfer } from "../services/transferService";
import { db, stockCardTable, warehousesTable } from "@workspace/db";
import { eq, or, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/inventory/transfers", requireAuth, async (req, res) => {
  try {
    const { branchId, sourceWarehouseId, destWarehouseId, itemType, itemId, quantity, transferType, description } = req.body;

    if (!branchId || !sourceWarehouseId || !destWarehouseId || !itemType || !itemId || !quantity) {
      return res.status(400).json({ error: "branchId, sourceWarehouseId, destWarehouseId, itemType, itemId, quantity required" });
    }
    if (sourceWarehouseId === destWarehouseId) {
      return res.status(400).json({ error: "Source and destination warehouse must be different" });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be positive" });
    }

    const result = await createTransfer({
      branchId: Number(branchId),
      sourceWarehouseId: Number(sourceWarehouseId),
      destWarehouseId: Number(destWarehouseId),
      itemType: String(itemType),
      itemId: Number(itemId),
      quantity: Number(quantity),
      transferType: transferType as "warehouse" | "branch" | undefined,
      description: description ? String(description) : undefined,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get("/inventory/transfers", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const rows = await db
      .select({
        id: stockCardTable.id,
        movementType: stockCardTable.movementType,
        itemType: stockCardTable.itemType,
        itemId: stockCardTable.itemId,
        qtyChange: stockCardTable.qtyChange,
        warehouseId: stockCardTable.warehouseId,
        warehouseName: warehousesTable.name,
        referenceType: stockCardTable.referenceType,
        referenceId: stockCardTable.referenceId,
        description: stockCardTable.description,
        createdAt: stockCardTable.createdAt,
      })
      .from(stockCardTable)
      .leftJoin(warehousesTable, eq(stockCardTable.warehouseId, warehousesTable.id))
      .where(
        or(
          eq(stockCardTable.movementType, "warehouse_transfer"),
          eq(stockCardTable.movementType, "branch_transfer"),
        ),
      )
      .orderBy(desc(stockCardTable.createdAt))
      .limit(limit);

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
