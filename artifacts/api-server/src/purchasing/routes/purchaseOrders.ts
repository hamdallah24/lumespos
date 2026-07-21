import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createPurchaseOrder, transitionPoStatus, getPurchaseOrders, getPurchaseOrderById } from "../services/poService";

const router = Router();

router.get("/purchasing/purchase-orders", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const status = req.query["status"] as string | undefined;
    return res.json(await getPurchaseOrders(branchId, status));
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/purchasing/purchase-orders/:id", requireAuth, async (req, res) => {
  try {
    const po = await getPurchaseOrderById(Number(req.params["id"]));
    if (!po) return res.status(404).json({ error: "PO not found" });
    return res.json(po);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/purchasing/purchase-orders", requireAuth, async (req, res) => {
  try {
    const { supplierId, branchId, orderDate, expectedDate, notes, shippingCost, taxAmount, items } = req.body;
    if (!supplierId || !branchId || !orderDate || !items?.length) {
      return res.status(400).json({ error: "supplierId, branchId, orderDate, items required" });
    }
    const po = await createPurchaseOrder({
      supplierId: Number(supplierId), branchId: Number(branchId), orderDate,
      expectedDate, notes, shippingCost, taxAmount,
      items: items.map((i: any) => ({ ...i, itemType: i.itemType || "ingredient" })),
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });
    return res.status(201).json(po);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/purchasing/purchase-orders/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });
    const po = await transitionPoStatus(Number(req.params["id"]), status, req.user?.id ? Number(req.user.id) : undefined);
    return res.json(po);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

export default router;
