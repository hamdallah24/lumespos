import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, binsTable } from "@workspace/db";
import { eq, and, like, desc } from "drizzle-orm";

const router = Router();

router.get("/bins", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const warehouseId = req.query["warehouseId"] ? Number(req.query["warehouseId"]) : undefined;
    const q = String(req.query["q"] || "");

    const conditions = [eq(binsTable.branchId, branchId)];
    if (warehouseId) conditions.push(eq(binsTable.warehouseId, warehouseId));
    if (q) conditions.push(like(binsTable.code, `%${q}%`));

    const rows = await db.select().from(binsTable).where(and(...conditions)).orderBy(binsTable.zone, binsTable.aisle, binsTable.rack, binsTable.shelf);
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/bins/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(binsTable).where(eq(binsTable.id, Number(req.params.id)));
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/bins", requireAuth, async (req, res) => {
  try {
    const { code, warehouseId, branchId, zone, aisle, rack, shelf, bin, capacity } = req.body;
    if (!code || !warehouseId || !branchId) return res.status(400).json({ error: "code, warehouseId, branchId required" });
    const [row] = await db.insert(binsTable).values({
      code,
      warehouseId: Number(warehouseId),
      branchId: Number(branchId),
      zone: zone || null,
      aisle: aisle || null,
      rack: rack || null,
      shelf: shelf || null,
      bin: bin || null,
      capacity: capacity || null,
    }).returning();
    return res.status(201).json(row);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/bins/bulk", requireAuth, async (req, res) => {
  try {
    const { bins } = req.body;
    if (!Array.isArray(bins) || bins.length === 0) return res.status(400).json({ error: "bins array required" });
    const created = [];
    for (const b of bins) {
      const [row] = await db.insert(binsTable).values(b).returning();
      created.push(row);
    }
    return res.status(201).json({ created: created.length, bins: created });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.put("/bins/:id", requireAuth, async (req, res) => {
  try {
    const allowed = ["code", "zone", "aisle", "rack", "shelf", "bin", "capacity", "isActive"];
    const updates: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [row] = await db.update(binsTable).set(updates).where(eq(binsTable.id, Number(req.params.id))).returning();
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/bins/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(binsTable).where(eq(binsTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;