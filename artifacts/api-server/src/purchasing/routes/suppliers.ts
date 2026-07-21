import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { createSupplier, getAllSuppliers, getSupplierById, updateSupplier } from "../services/supplierService";

const router = Router();

router.get("/purchasing/suppliers", requireAuth, async (_req, res) => {
  try { return res.json(await getAllSuppliers()); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/purchasing/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const s = await getSupplierById(Number(req.params["id"]));
    if (!s) return res.status(404).json({ error: "Supplier not found" });
    return res.json(s);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/purchasing/suppliers", requireAuth, async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, taxId, paymentTerms } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const s = await createSupplier({ name, contactPerson, phone, email, address, taxId, paymentTerms });
    return res.status(201).json(s);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/purchasing/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const s = await updateSupplier(Number(req.params["id"]), req.body);
    if (!s) return res.status(404).json({ error: "Supplier not found" });
    return res.json(s);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
