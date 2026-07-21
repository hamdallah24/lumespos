import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createGoodsReceipt, getGoodsReceipts } from "../services/receiptService";

const router = Router();

router.get("/purchasing/goods-receipts", requireAuth, async (req, res) => {
  try {
    const poId = req.query["poId"] ? Number(req.query["poId"]) : undefined;
    return res.json(await getGoodsReceipts(poId));
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/purchasing/goods-receipts", requireAuth, async (req, res) => {
  try {
    const { poId, branchId, warehouseId, receivedDate, notes } = req.body;
    if (!poId || !branchId || !warehouseId || !receivedDate) {
      return res.status(400).json({ error: "poId, branchId, warehouseId, receivedDate required" });
    }
    const gr = await createGoodsReceipt({
      poId: Number(poId), branchId: Number(branchId), warehouseId: Number(warehouseId),
      receivedDate, notes, receivedBy: req.user?.id ? Number(req.user.id) : undefined,
    });
    return res.status(201).json(gr);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

export default router;
