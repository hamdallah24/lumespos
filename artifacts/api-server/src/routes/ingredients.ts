import { Router } from "express";
import { db, ingredientsTable, currentInventoryTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/ingredients", requireAuth, async (req, res) => {
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  const rows = await db
    .select({
      id: ingredientsTable.id,
      branchId: ingredientsTable.branchId,
      name: ingredientsTable.name,
      unit: ingredientsTable.unit,
      costPricePerUnit: ingredientsTable.costPricePerUnit,
      minimalStock: ingredientsTable.minimalStock,
      currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
    })
    .from(ingredientsTable)
    .leftJoin(
      currentInventoryTable,
      and(
        eq(currentInventoryTable.itemType, sql`'ingredient'`),
        eq(currentInventoryTable.itemId, ingredientsTable.id),
        eq(currentInventoryTable.branchId, ingredientsTable.branchId),
      ),
    )
    .where(branchId ? eq(ingredientsTable.branchId, branchId) : undefined)
    .orderBy(ingredientsTable.name);

  res.json(
    rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      name: r.name,
      unit: r.unit,
      costPricePerUnit: parseFloat(r.costPricePerUnit),
      minimalStock: parseFloat(r.minimalStock),
      currentStock: parseFloat(r.currentStock),
    })),
  );
});

router.post("/ingredients", requireRole("owner", "manager"), async (req, res) => {
  const { branchId, name, unit, minimalStock } = req.body as {
    branchId: number;
    name: string;
    unit: string;
    minimalStock?: number;
  };
  if (!branchId || !name?.trim() || !unit?.trim()) {
    res.status(400).json({ error: "branchId, name and unit are required" });
    return;
  }
  const [created] = await db
    .insert(ingredientsTable)
    .values({
      branchId,
      name: name.trim(),
      unit: unit.trim(),
      minimalStock: String(minimalStock ?? 0),
    })
    .returning();
  res.status(201).json({
    ...created,
    costPricePerUnit: parseFloat(created.costPricePerUnit),
    minimalStock: parseFloat(created.minimalStock),
    currentStock: 0,
  });
});

router.patch("/ingredients/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, unit, minimalStock } = req.body as {
    name?: string;
    unit?: string;
    minimalStock?: number;
  };
  const update: Record<string, string> = {};
  if (name !== undefined) update["name"] = name.trim();
  if (unit !== undefined) update["unit"] = unit.trim();
  if (minimalStock !== undefined) update["minimalStock"] = String(minimalStock);
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(ingredientsTable)
    .set(update)
    .where(eq(ingredientsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    ...updated,
    costPricePerUnit: parseFloat(updated.costPricePerUnit),
    minimalStock: parseFloat(updated.minimalStock),
    currentStock: 0,
  });
});

router.delete("/ingredients/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id));
  res.status(204).send();
});

export default router;
