import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, uomsTable, uomConversionsTable } from "@workspace/db";
import { eq, and, like, desc, sql } from "drizzle-orm";

const router = Router();

// ── UOMs ──

router.get("/uoms", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const rows = await db.select().from(uomsTable)
      .where(and(eq(uomsTable.branchId, branchId), eq(uomsTable.isActive, true)))
      .orderBy(uomsTable.code);
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/uoms/all", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const rows = await db.select().from(uomsTable)
      .where(eq(uomsTable.branchId, branchId))
      .orderBy(uomsTable.code);
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/uoms/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(uomsTable).where(eq(uomsTable.id, Number(req.params.id)));
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/uoms", requireAuth, async (req, res) => {
  try {
    const { code, name, branchId, type, decimalPlaces } = req.body;
    if (!code || !name || !branchId) return res.status(400).json({ error: "code, name, branchId required" });
    const [row] = await db.insert(uomsTable).values({
      code, name, branchId: Number(branchId),
      type: type || "count", decimalPlaces: decimalPlaces || 0,
    }).returning();
    return res.status(201).json(row);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.put("/uoms/:id", requireAuth, async (req, res) => {
  try {
    const allowed = ["code", "name", "type", "decimalPlaces", "isActive"];
    const updates: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [row] = await db.update(uomsTable).set(updates).where(eq(uomsTable.id, Number(req.params.id))).returning();
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/uoms/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(uomConversionsTable).where(sql`${uomConversionsTable.fromUomId} = ${id} OR ${uomConversionsTable.toUomId} = ${id}`);
    await db.delete(uomsTable).where(eq(uomsTable.id, id));
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── UOM Conversions ──

router.get("/uom-conversions", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const rows = await db.select({
      id: uomConversionsTable.id,
      branchId: uomConversionsTable.branchId,
      fromUomId: uomConversionsTable.fromUomId,
      toUomId: uomConversionsTable.toUomId,
      conversionFactor: uomConversionsTable.conversionFactor,
      isActive: uomConversionsTable.isActive,
      fromUomCode: uomsTable.code,
      fromUomName: uomsTable.name,
    }).from(uomConversionsTable)
      .leftJoin(uomsTable, eq(uomConversionsTable.fromUomId, uomsTable.id))
      .where(and(eq(uomConversionsTable.branchId, branchId), eq(uomConversionsTable.isActive, true)));
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/uom-conversions", requireAuth, async (req, res) => {
  try {
    const { fromUomId, toUomId, conversionFactor, branchId } = req.body;
    if (!fromUomId || !toUomId || !conversionFactor || !branchId)
      return res.status(400).json({ error: "fromUomId, toUomId, conversionFactor, branchId required" });
    if (Number(conversionFactor) <= 0)
      return res.status(400).json({ error: "conversionFactor must be positive" });
    const [row] = await db.insert(uomConversionsTable).values({
      fromUomId: Number(fromUomId), toUomId: Number(toUomId),
      conversionFactor, branchId: Number(branchId),
    }).returning();
    return res.status(201).json(row);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.put("/uom-conversions/:id", requireAuth, async (req, res) => {
  try {
    const allowed = ["conversionFactor", "isActive"];
    const updates: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [row] = await db.update(uomConversionsTable).set(updates).where(eq(uomConversionsTable.id, Number(req.params.id))).returning();
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/uom-conversions/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(uomConversionsTable).where(eq(uomConversionsTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── Conversion Engine ──

router.post("/uoms/convert", requireAuth, async (req, res) => {
  try {
    const { fromUomId, toUomId, quantity, branchId } = req.body;
    if (!fromUomId || !toUomId || quantity === undefined || !branchId)
      return res.status(400).json({ error: "fromUomId, toUomId, quantity, branchId required" });

    const branch = Number(branchId);
    const qty = Number(quantity);

    if (Number(fromUomId) === Number(toUomId)) {
      return res.json({ result: qty, conversionFactor: "1", path: [] });
    }

    // BFS to find conversion path within same branch
    const allConversions = await db.select().from(uomConversionsTable)
      .where(and(eq(uomConversionsTable.branchId, branch), eq(uomConversionsTable.isActive, true)));

    const graph = new Map<number, Array<{ to: number; factor: number }>>();
    for (const c of allConversions) {
      if (!graph.has(c.fromUomId)) graph.set(c.fromUomId, []);
      if (!graph.has(c.toUomId)) graph.set(c.toUomId, []);
      graph.get(c.fromUomId)!.push({ to: c.toUomId, factor: Number(c.conversionFactor) });
      graph.get(c.toUomId)!.push({ to: c.fromUomId, factor: 1 / Number(c.conversionFactor) });
    }

    const visited = new Set<number>();
    const queue: Array<{ id: number; factor: number; path: string[] }> = [{ id: Number(fromUomId), factor: 1, path: [String(fromUomId)] }];
    visited.add(Number(fromUomId));

    let found = false;
    let resultFactor = 1;
    let resultPath: string[] = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.id === Number(toUomId)) {
        resultFactor = curr.factor;
        resultPath = curr.path;
        found = true;
        break;
      }
      for (const edge of graph.get(curr.id) || []) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({ id: edge.to, factor: curr.factor * edge.factor, path: [...curr.path, String(edge.to)] });
        }
      }
    }

    if (!found) return res.status(400).json({ error: "No conversion path found between selected UOMs" });

    return res.json({
      result: qty * resultFactor,
      conversionFactor: String(resultFactor),
      path: resultPath,
    });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── Seed default UOMs ──

router.post("/uoms/seed", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.body["branchId"]) || 1;
    const defaults = [
      { code: "PCS", name: "Pieces", type: "count", decimalPlaces: 0 },
      { code: "BOX", name: "Box", type: "count", decimalPlaces: 0 },
      { code: "PACK", name: "Pack", type: "count", decimalPlaces: 0 },
      { code: "DUS", name: "Carton", type: "count", decimalPlaces: 0 },
      { code: "KG", name: "Kilogram", type: "weight", decimalPlaces: 2 },
      { code: "GR", name: "Gram", type: "weight", decimalPlaces: 0 },
      { code: "L", name: "Liter", type: "volume", decimalPlaces: 2 },
      { code: "ML", name: "Milliliter", type: "volume", decimalPlaces: 0 },
      { code: "M", name: "Meter", type: "length", decimalPlaces: 2 },
      { code: "CM", name: "Centimeter", type: "length", decimalPlaces: 0 },
    ];
    const created: any[] = [];
    for (const u of defaults) {
      const existing = await db.select({ id: uomsTable.id }).from(uomsTable)
        .where(and(eq(uomsTable.code, u.code), eq(uomsTable.branchId, branchId))).limit(1);
      if (existing.length === 0) {
        const [row] = await db.insert(uomsTable).values({ ...u, branchId }).returning();
        created.push(row);
      }
    }
    return res.status(201).json({ message: `Seeded ${created.length} UOMs`, created });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;