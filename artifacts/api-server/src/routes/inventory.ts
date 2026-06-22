import { Router } from "express";
import { db, stockAdjustmentsTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";
import {
  adjustInventory,
  applyMovingAverage,
  listInventoryForBranch,
  LOW_STOCK_DEFAULT,
  type Executor,
  type ItemType,
} from "../services/inventory";

const router = Router();

router.get("/inventory", requireAuth, requireBranchAccess((req) => Number(req.query["branchId"] ?? 1)), async (req, res) => {
  const branchId = Number(req.query["branchId"] ?? 1);
  res.json(await listInventoryForBranch(branchId));
});

router.get("/inventory/low-stock", requireAuth, requireBranchAccess((req) => Number(req.query["branchId"] ?? 1)), async (req, res) => {
  const branchId = Number(req.query["branchId"] ?? 1);
  const threshold = req.query["threshold"] ? Number(req.query["threshold"]) : LOW_STOCK_DEFAULT;
  const all = await listInventoryForBranch(branchId);
  // Ingredients: compare against their own minimalStock when set, else threshold.
  const low = all.filter((item) => {
    const limit =
      item.itemType === "ingredient" && item.minimalStock && item.minimalStock > 0
        ? item.minimalStock
        : threshold;
    return item.currentStock < limit;
  });
  res.json(low);
});

router.get("/stock-adjustments", requireAuth, async (req, res) => {
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  if (branchId && !(await canAccessBranch(req, branchId))) {
    res.status(403).json({ error: "Forbidden branch" });
    return;
  }
  if (!branchId && req.user?.role !== "owner" && req.user?.role !== "manager") {
    res.status(400).json({ error: "branchId required" });
    return;
  }
  const rows = await db
    .select()
    .from(stockAdjustmentsTable)
    .where(branchId ? eq(stockAdjustmentsTable.branchId, branchId) : undefined)
    .orderBy(desc(stockAdjustmentsTable.createdAt))
    .limit(200);

  const ingIds = rows.filter((r) => r.itemType === "ingredient").map((r) => r.itemId);
  const sfIds = rows.filter((r) => r.itemType === "semi_finished").map((r) => r.itemId);
  const ings = ingIds.length
    ? await db
        .select({ id: ingredientsTable.id, name: ingredientsTable.name })
        .from(ingredientsTable)
        .where(inArray(ingredientsTable.id, ingIds))
    : [];
  const sfs = sfIds.length
    ? await db
        .select({ id: semiFinishedTable.id, name: semiFinishedTable.name })
        .from(semiFinishedTable)
        .where(inArray(semiFinishedTable.id, sfIds))
    : [];
  const ingMap = new Map(ings.map((i) => [i.id, i.name]));
  const sfMap = new Map(sfs.map((s) => [s.id, s.name]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      itemType: r.itemType,
      itemId: r.itemId,
      itemName: (r.itemType === "ingredient" ? ingMap.get(r.itemId) : sfMap.get(r.itemId)) ?? "",
      adjustmentType: r.adjustmentType,
      quantity: parseFloat(r.quantity),
      purchasePriceTotal: r.purchasePriceTotal ? parseFloat(r.purchasePriceTotal) : null,
      notes: r.notes,
      createdAt: r.createdAt,
    })),
  );
});

router.post("/stock-adjustments", requireRole("owner", "manager"), requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  const { branchId, itemType, itemId, adjustmentType, quantity, purchasePriceTotal, notes } =
    req.body as {
      branchId: number;
      itemType: ItemType;
      itemId: number;
      adjustmentType: "in" | "out" | "loss";
      quantity: number;
      purchasePriceTotal?: number | null;
      notes?: string | null;
    };

  if (!branchId || !itemType || !itemId || !adjustmentType || !quantity || quantity <= 0) {
    res.status(400).json({ error: "branchId, itemType, itemId, adjustmentType and quantity are required" });
    return;
  }

  const created = await db.transaction(async (tx: Executor) => {
    // Moving-average COGS on raw-material stock-in with a purchase price.
    if (
      adjustmentType === "in" &&
      itemType === "ingredient" &&
      purchasePriceTotal != null &&
      purchasePriceTotal > 0
    ) {
      await applyMovingAverage(tx, branchId, itemId, quantity, purchasePriceTotal);
    }

    const delta = adjustmentType === "in" ? quantity : -quantity;
    await adjustInventory(tx, branchId, itemType, itemId, delta);

    const [row] = await tx
      .insert(stockAdjustmentsTable)
      .values({
        branchId,
        itemType,
        itemId,
        adjustmentType,
        quantity: String(quantity),
        purchasePriceTotal: purchasePriceTotal != null ? String(purchasePriceTotal) : null,
        notes: notes ?? null,
      })
      .returning();
    return row;
  });

  res.status(201).json({
    id: created.id,
    branchId: created.branchId,
    itemType: created.itemType,
    itemId: created.itemId,
    adjustmentType: created.adjustmentType,
    quantity: parseFloat(created.quantity),
    purchasePriceTotal: created.purchasePriceTotal ? parseFloat(created.purchasePriceTotal) : null,
    notes: created.notes,
    createdAt: created.createdAt,
  });
});

export default router;
