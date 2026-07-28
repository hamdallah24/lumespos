import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, itemsTable, itemCategoriesTable } from "@workspace/db";
import { eq, and, like, desc, sql } from "drizzle-orm";

const router = Router();

// ── Categories ──

router.get("/items/categories", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(itemCategoriesTable).where(eq(itemCategoriesTable.isActive, true)).orderBy(itemCategoriesTable.name);
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/items/categories", requireAuth, async (req, res) => {
  try {
    const { name, parentId, color } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const [row] = await db.insert(itemCategoriesTable).values({ name, parentId: parentId || null, color: color || "#6366f1" }).returning();
    return res.status(201).json(row);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.put("/items/categories/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.update(itemCategoriesTable).set(req.body).where(eq(itemCategoriesTable.id, Number(req.params.id))).returning();
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/items/categories/:id", requireAuth, async (req, res) => {
  try {
    await db.update(itemCategoriesTable).set({ isActive: false }).where(eq(itemCategoriesTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── Items ──

router.get("/items", requireAuth, async (req, res) => {
  try {
    const branchId = Number(req.query["branchId"]) || 1;
    const q = String(req.query["q"] || "");
    const categoryId = req.query["categoryId"] ? Number(req.query["categoryId"]) : undefined;
    const type = req.query["type"] ? String(req.query["type"]) : undefined;
    const page = Number(req.query["page"]) || 1;
    const limit = Math.min(Number(req.query["limit"]) || 50, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(itemsTable.branchId, branchId)];
    if (q) conditions.push(like(itemsTable.name, `%${q}%`));
    if (categoryId) conditions.push(eq(itemsTable.categoryId, categoryId));
    if (type) conditions.push(eq(itemsTable.type, type));

    const where = and(...conditions);

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(itemsTable).where(where);
    const items = await db.select().from(itemsTable).where(where).orderBy(desc(itemsTable.id)).limit(limit).offset(offset);

    return res.json({ items, total: countResult?.count || 0, totalPages: Math.ceil((countResult?.count || 0) / limit), page });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/items/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(itemsTable).where(eq(itemsTable.id, Number(req.params.id)));
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/items", requireAuth, async (req, res) => {
  try {
    const { code, name, branchId, type, barcode, categoryId, baseUnit, purchasePrice, standardCost, defaultSupplierId, defaultWarehouseId, reorderPoint, minStock, maxStock, leadTime, safetyStock, description, imageUrl } = req.body;
    if (!code || !name || !branchId) return res.status(400).json({ error: "code, name, branchId required" });
    const [row] = await db.insert(itemsTable).values({
      code, name, branchId: Number(branchId), type: type || "raw_material",
      barcode, categoryId: categoryId || null, baseUnit: baseUnit || "pcs",
      purchasePrice: purchasePrice || "0", standardCost: standardCost || "0",
      defaultSupplierId: defaultSupplierId || null, defaultWarehouseId: defaultWarehouseId || null,
      reorderPoint: reorderPoint || "0", minStock: minStock || "0", maxStock: maxStock || "0",
      leadTime: leadTime || 0, safetyStock: safetyStock || "0",
      description, imageUrl,
    }).returning();
    return res.status(201).json(row);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.put("/items/:id", requireAuth, async (req, res) => {
  try {
    const allowed = ["code", "name", "barcode", "description", "categoryId", "type", "baseUnit", "purchaseUnit", "salesUnit", "purchaseUnitConversion", "salesUnitConversion", "purchasePrice", "standardCost", "defaultSupplierId", "defaultWarehouseId", "reorderPoint", "minStock", "maxStock", "leadTime", "safetyStock", "isActive", "imageUrl"];
    const updates: any = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    updates.updatedAt = new Date();
    const [row] = await db.update(itemsTable).set(updates).where(eq(itemsTable.id, Number(req.params.id))).returning();
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/items/:id", requireAuth, async (req, res) => {
  try {
    await db.update(itemsTable).set({ isActive: false, updatedAt: new Date() }).where(eq(itemsTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;