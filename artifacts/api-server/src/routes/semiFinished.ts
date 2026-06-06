import { Router } from "express";
import { db, semiFinishedTable, currentInventoryTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { adjustInventory, computeUnitCogs, getRecipeRows, type Executor } from "../services/inventory";

const router = Router();

function serialize(row: typeof semiFinishedTable.$inferSelect, currentStock: number) {
  return {
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    unit: row.unit,
    costPricePerUnit: parseFloat(row.costPricePerUnit),
    currentStock,
  };
}

router.get("/semi-finished", requireAuth, async (req, res) => {
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  const rows = await db
    .select({
      id: semiFinishedTable.id,
      branchId: semiFinishedTable.branchId,
      name: semiFinishedTable.name,
      unit: semiFinishedTable.unit,
      costPricePerUnit: semiFinishedTable.costPricePerUnit,
      currentStock: sql<string>`coalesce(${currentInventoryTable.currentStock}, '0')`,
    })
    .from(semiFinishedTable)
    .leftJoin(
      currentInventoryTable,
      and(
        eq(currentInventoryTable.itemType, sql`'semi_finished'`),
        eq(currentInventoryTable.itemId, semiFinishedTable.id),
        eq(currentInventoryTable.branchId, semiFinishedTable.branchId),
      ),
    )
    .where(branchId ? eq(semiFinishedTable.branchId, branchId) : undefined)
    .orderBy(semiFinishedTable.name);

  res.json(
    rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      name: r.name,
      unit: r.unit,
      costPricePerUnit: parseFloat(r.costPricePerUnit),
      currentStock: parseFloat(r.currentStock),
    })),
  );
});

router.post("/semi-finished", requireRole("owner", "manager"), async (req, res) => {
  const { branchId, name, unit } = req.body as { branchId: number; name: string; unit: string };
  if (!branchId || !name?.trim() || !unit?.trim()) {
    res.status(400).json({ error: "branchId, name and unit are required" });
    return;
  }
  const [created] = await db
    .insert(semiFinishedTable)
    .values({ branchId, name: name.trim(), unit: unit.trim() })
    .returning();
  res.status(201).json(serialize(created, 0));
});

router.patch("/semi-finished/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, unit } = req.body as { name?: string; unit?: string };
  const update: Record<string, string> = {};
  if (name !== undefined) update["name"] = name.trim();
  if (unit !== undefined) update["unit"] = unit.trim();
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(semiFinishedTable)
    .set(update)
    .where(eq(semiFinishedTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(updated, 0));
});

router.delete("/semi-finished/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(semiFinishedTable).where(eq(semiFinishedTable.id, id));
  res.status(204).send();
});

// Record production: deduct ingredients per recipe, store unit COGS, add stock.
router.post("/semi-finished/:id/produce", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { quantity } = req.body as { quantity: number };
  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: "quantity must be > 0" });
    return;
  }

  const result = await db.transaction(async (tx: Executor) => {
    const [sf] = await tx.select().from(semiFinishedTable).where(eq(semiFinishedTable.id, id));
    if (!sf) return null;

    // Unit COGS from the raw materials used (per 1 unit of this semi-finished good).
    const unitCost = await computeUnitCogs(tx, "semi_finished", id);

    // Deduct each recipe component for `quantity` units produced.
    const recipe = await getRecipeRows(tx, "semi_finished", id);
    for (const r of recipe) {
      await adjustInventory(tx, sf.branchId, r.componentType, r.componentId, -(r.quantity * quantity));
    }

    // Add produced quantity to this semi-finished good's stock and store its unit cost.
    await adjustInventory(tx, sf.branchId, "semi_finished", id, quantity);
    const [updated] = await tx
      .update(semiFinishedTable)
      .set({ costPricePerUnit: String(unitCost) })
      .where(eq(semiFinishedTable.id, id))
      .returning();
    return updated;
  });

  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(result, 0));
});

export default router;
