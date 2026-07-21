import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { getStockCard } from "../services/stockCardService";

const router = Router();

router.get("/inventory/stock-card/:itemType/:itemId", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const warehouseId = req.query["warehouseId"] ? Number(req.query["warehouseId"]) : undefined;
    const page = req.query["page"] ? Number(req.query["page"]) : 1;
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 50;

    if (!branchId || !warehouseId) {
      return res.status(400).json({ error: "branchId and warehouseId required" });
    }

    const itemType = req.params["itemType"];
    const itemId = Number(req.params["itemId"]);

    const result = await getStockCard(branchId, warehouseId, itemType, itemId, page, limit);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
