import { Router } from "express";
import { db, stockAdjustmentsTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";
import {
  listInventoryForBranch,
  LOW_STOCK_DEFAULT,
  type ItemType,
} from "../services/inventory";
import { createMovement, MOVEMENT_TYPES } from "../inventory/services/movementService";
import { EventPublisher } from "../event-bus";
import { createStockAdjustedEvent, createPurchaseReceivedEvent } from "../events";

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

// Cashier stock adjustment — hanya untuk track_in_shift items
router.post("/stock-adjustments/cashier", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, itemType, itemId, adjustmentType, quantity, notes } = req.body as {
      branchId: number;
      itemType: ItemType;
      itemId: number;
      adjustmentType: "in" | "out";
      quantity: number;
      notes?: string | null;
    };

    if (!branchId || !itemType || !itemId || !adjustmentType || !quantity || quantity <= 0) {
      res.status(400).json({ error: "branchId, itemType, itemId, adjustmentType and quantity are required" });
      return;
    }
    if (adjustmentType !== "in" && adjustmentType !== "out") {
      res.status(400).json({ error: "Hanya tipe 'in' dan 'out' yang diizinkan" });
      return;
    }

    // Validate item exists and has track_in_shift = true
    let trackInShift = false;
    if (itemType === "ingredient") {
      const [ing] = await db.select({ trackInShift: ingredientsTable.trackInShift }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId));
      trackInShift = ing?.trackInShift ?? false;
    } else if (itemType === "semi_finished") {
      const [sf] = await db.select({ trackInShift: semiFinishedTable.trackInShift }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId));
      trackInShift = sf?.trackInShift ?? false;
    }
    if (!trackInShift) {
      res.status(403).json({ error: "Hanya item dengan label audit yang bisa disesuaikan stoknya oleh kasir" });
      return;
    }

    const movementType = adjustmentType === "in" ? MOVEMENT_TYPES.STOCK_OPNAME : MOVEMENT_TYPES.WASTE_DAMAGE;
    let unitCost: number | undefined;
    if (adjustmentType === "in") {
      if (itemType === "ingredient") {
        const [row] = await db.select({ c: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId));
        unitCost = row ? parseFloat(row.c) : undefined;
      } else if (itemType === "semi_finished") {
        const [row] = await db.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId));
        unitCost = row ? parseFloat(row.c) : undefined;
      }
    }
    await createMovement({
      branchId, itemType, itemId, movementType, quantity,
      unitCost, description: notes || `Cashier ${adjustmentType}`,
    });
    const [created] = await db.insert(stockAdjustmentsTable).values({
      branchId, itemType, itemId, adjustmentType,
      quantity: String(quantity), notes: notes ?? null,
    }).returning();

    res.status(201).json({
      id: created.id,
      branchId: created.branchId,
      itemType: created.itemType,
      itemId: created.itemId,
      adjustmentType: created.adjustmentType,
      quantity: parseFloat(created.quantity),
      notes: created.notes,
      createdAt: created.createdAt,
    });
  } catch (err: any) {
    const msg = err?.message ?? "Internal server error";
    console.error("[stock-adjustments/cashier] Error:", msg);
    if (msg.includes("Insufficient stock")) {
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

router.post("/stock-adjustments", requireRole("owner", "manager"), requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
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

    const movementType = adjustmentType === "in" ? MOVEMENT_TYPES.STOCK_OPNAME : MOVEMENT_TYPES.WASTE_DAMAGE;
    let unitCost: number | undefined;
    if (adjustmentType === "in") {
      if (purchasePriceTotal != null && purchasePriceTotal > 0) {
        unitCost = purchasePriceTotal / quantity;
      } else {
        if (itemType === "ingredient") {
          const [row] = await db.select({ c: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId));
          unitCost = row ? parseFloat(row.c) : undefined;
        } else if (itemType === "semi_finished") {
          const [row] = await db.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId));
          unitCost = row ? parseFloat(row.c) : undefined;
        }
      }
    }
    await createMovement({
      branchId, itemType, itemId, movementType, quantity,
      unitCost, description: notes || `Adjustment ${adjustmentType}`,
    });
    const [created] = await db.insert(stockAdjustmentsTable).values({
      branchId, itemType, itemId, adjustmentType,
      quantity: String(quantity),
      purchasePriceTotal: purchasePriceTotal != null ? String(purchasePriceTotal) : null,
      notes: notes ?? null,
    }).returning();

    const newStock = created.adjustmentType === "in"
      ? parseFloat(created.quantity)
      : 0;

    if (created.adjustmentType === "in") {
      EventPublisher.publish(createStockAdjustedEvent({
        branchId: created.branchId,
        itemType: created.itemType as "ingredient" | "semi_finished",
        itemId: created.itemId,
        delta: parseFloat(created.quantity),
        newStock,
        previousStock: newStock - parseFloat(created.quantity),
      }));
    }

    if (created.adjustmentType === "in" && created.purchasePriceTotal) {
      EventPublisher.publish(createPurchaseReceivedEvent({
        branchId: created.branchId,
        ingredientId: created.itemId,
        quantity: parseFloat(created.quantity),
        purchaseTotal: parseFloat(created.purchasePriceTotal),
        newAverageCost: 0,
      }));
    }

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
  } catch (err: any) {
    const msg = err?.message ?? "Internal server error";
    console.error("[stock-adjustments] Error:", msg);
    if (msg.includes("Insufficient stock")) {
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

export default router;
