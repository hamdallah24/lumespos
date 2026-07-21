import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createInvoice, approveInvoice, getInvoices } from "../services/invoiceService";
import { runPurchasingValidation } from "../services/validationEngine";
import { getPurchasingDashboard } from "../services/dashboardService";
import { consumePurchaseEvent } from "../../finance/services/purchaseEventConsumer";

const router = Router();

router.get("/purchasing/invoices", requireAuth, async (req, res) => {
  try {
    const poId = req.query["poId"] ? Number(req.query["poId"]) : undefined;
    const status = req.query["status"] as string | undefined;
    return res.json(await getInvoices(poId, status));
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/purchasing/invoices", requireAuth, async (req, res) => {
  try {
    const { invoiceNumber, supplierId, poId, invoiceDate, dueDate, totalAmount, notes } = req.body;
    if (!invoiceNumber || !supplierId || !poId || !invoiceDate || !totalAmount) {
      return res.status(400).json({ error: "invoiceNumber, supplierId, poId, invoiceDate, totalAmount required" });
    }
    const inv = await createInvoice({
      invoiceNumber, supplierId: Number(supplierId), poId: Number(poId),
      invoiceDate, dueDate, totalAmount: Number(totalAmount), notes,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });
    return res.status(201).json(inv);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.post("/purchasing/invoices/:id/approve", requireAuth, async (req, res) => {
  try {
    const inv = await approveInvoice(Number(req.params["id"]), req.user?.id ? Number(req.user.id) : undefined);
    // Publish to Finance after approval
    await consumePurchaseEvent({
      eventType: "invoice.approved",
      data: { invoiceNumber: inv.invoiceNumber, poId: inv.poId, totalAmount: parseFloat(inv.totalAmount) },
    });
    return res.json(inv);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.get("/purchasing/validation", requireAuth, async (_req, res) => {
  try { return res.json(await runPurchasingValidation()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/purchasing/dashboard", requireAuth, async (_req, res) => {
  try { return res.json(await getPurchasingDashboard()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
