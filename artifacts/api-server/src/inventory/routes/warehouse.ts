import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { getAllWarehouses, getWarehouseById, ensureDefaultWarehouse } from "../services/warehouseService";

const router = Router();

router.get("/inventory/warehouses", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const warehouses = await getAllWarehouses(branchId);
    return res.json(warehouses);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/warehouses/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const wh = await getWarehouseById(id);
    if (!wh) return res.status(404).json({ error: "Warehouse not found" });
    return res.json(wh);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/inventory/warehouses/default", requireAuth, async (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ error: "branchId required" });
    const id = await ensureDefaultWarehouse(Number(branchId));
    return res.json({ id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
