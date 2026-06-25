import { Router } from "express";
import { db, shiftAuditsTable, usersTable, currentInventoryTable, stockAdjustmentsTable, ordersTable, orderItemsTable, productsTable, productVariantsTable, recipesTable } from "@workspace/db";
import { and, desc, eq, sql, gte, lte } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";
import { listInventoryForBranch, listInventoryForShift, adjustInventory, type Executor, type ItemType } from "../services/inventory";

const router = Router();

const WARNING_PCT = 5;

type StockEntry = {
  itemType: ItemType;
  itemId: number;
  name: string;
  unit: string;
  quantity: number;
};

function snapshotFromInventory(inv: Awaited<ReturnType<typeof listInventoryForBranch>>): StockEntry[] {
  return inv.map((i) => ({
    itemType: i.itemType,
    itemId: i.itemId,
    name: i.name,
    unit: i.unit,
    quantity: i.currentStock,
  }));
}

function buildReconciliation(expected: StockEntry[], actual: StockEntry[]) {
  const actualMap = new Map(actual.map((a) => [`${a.itemType}:${a.itemId}`, a]));
  let maxDiscrepancyPct = 0;
  const reconciliation = expected.map((e) => {
    const a = actualMap.get(`${e.itemType}:${e.itemId}`);
    const actualQty = a ? a.quantity : 0;
    const diff = actualQty - e.quantity;
    const diffPct = e.quantity !== 0 ? (diff / e.quantity) * 100 : actualQty !== 0 ? 100 : 0;
    const absPct = Math.abs(diffPct);
    if (absPct > maxDiscrepancyPct) maxDiscrepancyPct = absPct;
    return {
      itemType: e.itemType,
      itemId: e.itemId,
      name: e.name,
      unit: e.unit,
      expected: e.quantity,
      actual: actualQty,
      diff,
      diffPct,
      isWarning: absPct > WARNING_PCT,
    };
  });
  return { reconciliation, maxDiscrepancyPct };
}

// GET /api/shift/sales - ambil total penjualan shift
router.get("/shift/sales", requireAuth, async (req, res) => {
  try {
    const shiftId = Number(req.query.shiftId);
    if (!shiftId || isNaN(shiftId)) {
      return res.status(400).json({ error: "shiftId required" });
    }

    const [shift] = await db
      .select()
      .from(shiftAuditsTable)
      .where(eq(shiftAuditsTable.id, shiftId));

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }
    if (!(await canAccessBranch(req, shift.branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    if (!shift.shiftStart) {
      return res.status(400).json({ error: "Shift start date is missing" });
    }

    const result = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total ELSE 0 END), 0) as qris,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card,
        COUNT(*) as total_orders
      FROM orders 
      WHERE branch_id = ${shift.branchId}
        AND created_at >= ${shift.shiftStart}
        AND status = 'completed'
    `);

    const firstRow = result.rows[0] as any;
    const cashTotal = firstRow ? parseFloat(firstRow.cash || 0) : 0;
    const qrisTotal = firstRow ? parseFloat(firstRow.qris || 0) : 0;
    const cardTotal = firstRow ? parseFloat(firstRow.card || 0) : 0;

    return res.json({
      cash: cashTotal,
      qris: qrisTotal,
      card: cardTotal,
      total: cashTotal + qrisTotal + cardTotal,
      totalOrders: firstRow ? parseInt(firstRow.total_orders || 0) : 0,
    });
  } catch (error) {
    console.error("GET /shift/sales error:", error);
    return res.status(500).json({ error: "Internal server error: " + (error as Error).message });
  }
});

// POST /api/shift/start - mulai shift baru dengan modal awal
router.post("/shift/start", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, cashierId, cashierName, openingBalance } = req.body;
    const userId = (req.user as any)?.id;

    if (!branchId || !cashierId) {
      return res.status(400).json({ error: "branchId and cashierId are required" });
    }
    if (openingBalance === undefined || openingBalance < 0) {
      return res.status(400).json({ error: "openingBalance must be >= 0" });
    }

    // Cek apakah sudah ada shift aktif di cabang ini
    const existingShift = await db
      .select()
      .from(shiftAuditsTable)
      .where(
        and(
          eq(shiftAuditsTable.branchId, branchId),
          eq(shiftAuditsTable.status, "active")
        )
      )
      .limit(1);

    if (existingShift.length > 0) {
      return res.status(400).json({ error: "Masih ada shift aktif di cabang ini. Tutup shift sebelumnya terlebih dahulu." });
    }

    const [newShift] = await db
      .insert(shiftAuditsTable)
      .values({
        branchId,
        cashierId,
        openingBalance: String(openingBalance),
        shiftStart: new Date(),
        status: "active",
      })
      .returning();

    return res.status(201).json({
      success: true,
      shift: {
        id: newShift.id,
        openingBalance: parseFloat(newShift.openingBalance),
        shiftStart: newShift.shiftStart,
      },
    });
  } catch (error) {
    console.error("POST /shift/start error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shift/end - tutup shift
router.post("/shift/end", requireAuth, async (req, res) => {
  try {
    const { shiftId, closingBalance, photoProofUrl, actualStock, notes } = req.body;

    if (!shiftId || closingBalance === undefined) {
      return res.status(400).json({ error: "shiftId and closingBalance required" });
    }

    const [shift] = await db
      .select()
      .from(shiftAuditsTable)
      .where(eq(shiftAuditsTable.id, shiftId));

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }
    if (!(await canAccessBranch(req, shift.branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    // Hitung total cash dari order
    const [sales] = await db
      .select({ totalCash: sql<string>`COALESCE(SUM(total), 0)` })
      .from(sql`orders`)
      .where(
        and(
          eq(sql`branch_id`, shift.branchId),
          eq(sql`payment_method`, "cash"),
          sql`created_at >= ${shift.shiftStart}`,
          eq(sql`status`, "completed")
        )
      );

    const totalCash = parseFloat(sales?.totalCash || "0");
    const expectedBalance = parseFloat(shift.openingBalance) + totalCash;
    const difference = closingBalance - expectedBalance;
    let status = difference !== 0 ? "discrepancy" : "pending";

    // Hitung Physical Stock Difference
    let expectedStock = null;
    if (Array.isArray(actualStock) && actualStock.length > 0) {
      const inv = await listInventoryForShift(shift.branchId);
      expectedStock = snapshotFromInventory(inv);
      const { maxDiscrepancyPct } = buildReconciliation(expectedStock, actualStock);
      if (maxDiscrepancyPct > WARNING_PCT) {
        status = "discrepancy";
      }
    }

    // Gabungkan JSON catatannya
    const notesObj = { closingBalance, expectedBalance, difference, totalCash, userNotes: notes || null };

    const [updatedShift] = await db
      .update(shiftAuditsTable)
      .set({
        shiftEnd: new Date(),
        status,
        closingBalance: String(closingBalance),
        expectedBalance: String(expectedBalance),
        expectedStockJson: expectedStock,
        actualStockJson: Array.isArray(actualStock) && actualStock.length > 0 ? actualStock : null,
        photoProofUrl: photoProofUrl || null,
        notes: JSON.stringify(notesObj),
      })
      .where(eq(shiftAuditsTable.id, shiftId))
      .returning();

    // ── AUTO-CORRECTION: koreksi inventory dari selisih expected vs actual ──
    let correction: { corrected: number; details: { item: string; diff: number; type: string }[] } | null = null;
    if (expectedStock && Array.isArray(actualStock) && actualStock.length > 0) {
      const details: { item: string; diff: number; type: string }[] = [];
      let corrected = 0;
      try {
        await db.transaction(async (tx: any) => {
          for (const item of expectedStock) {
            const actual = (actualStock as any[]).find((a: any) => a.name === item.name);
            if (!actual) continue;
            const diff = actual.quantity - item.quantity;
            if (Math.abs(diff) < 0.01) continue;
            await adjustInventory(tx, shift.branchId, item.itemType, item.itemId, diff);
            await tx.insert(stockAdjustmentsTable).values({
              branchId: shift.branchId, itemType: item.itemType, itemId: item.itemId,
              adjustmentType: diff < 0 ? "loss" : "in",
              quantity: String(Math.abs(diff)),
              notes: `Auto-koreksi dari tutup shift #${shiftId}`,
            });
            details.push({ item: item.name, diff: Number(diff.toFixed(2)), type: diff < 0 ? "loss" : "in" });
            corrected++;
          }
        });
      } catch (e) { console.error("Auto-correction error:", e); }
      if (corrected > 0) {
        correction = { corrected, details };
        await db.update(shiftAuditsTable)
          .set({ status: "corrected" })
          .where(eq(shiftAuditsTable.id, shiftId));
      }
    }

    return res.json({
      success: true,
      ...(correction ? { autoCorrection: correction } : {}),
      shift: {
        id: updatedShift.id,
        expectedBalance,
        closingBalance,
        difference
      }
    });
  } catch (error) {
    console.error("POST /shift/end error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shift/active - cek shift aktif untuk cashier
router.get("/shift/active", requireAuth, requireBranchAccess((req) => Number(req.query.branchId)), async (req, res) => {
  try {
    const branchId = Number(req.query.branchId);

    if (!branchId) {
      return res.status(400).json({ error: "branchId required" });
    }

    const activeShift = await db
      .select()
      .from(shiftAuditsTable)
      .where(
        and(
          eq(shiftAuditsTable.branchId, branchId),
          eq(shiftAuditsTable.status, "active")
        )
      )
      .limit(1);

    if (activeShift.length === 0) {
      return res.json({ hasActiveShift: false });
    }

    return res.json({
      hasActiveShift: true,
      shift: {
        id: activeShift[0].id,
        openingBalance: parseFloat(activeShift[0].openingBalance),
        shiftStart: activeShift[0].shiftStart,
      },
    });
  } catch (error) {
    console.error("GET /shift/active error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shift-audits - list semua audit shift
router.get("/shift-audits", requireRole("owner", "manager"), async (req, res) => {
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  if (branchId && !(await canAccessBranch(req, branchId))) {
    res.status(403).json({ error: "Forbidden branch" });
    return;
  }
  const rows = await db
    .select({
      id: shiftAuditsTable.id,
      branchId: shiftAuditsTable.branchId,
      cashierId: shiftAuditsTable.cashierId,
      cashierName: usersTable.name,
      shiftStart: shiftAuditsTable.shiftStart,
      shiftEnd: shiftAuditsTable.shiftEnd,
      photoProofUrl: shiftAuditsTable.photoProofUrl,
      status: shiftAuditsTable.status,
      notes: shiftAuditsTable.notes,
      createdAt: shiftAuditsTable.createdAt,
      expectedStockJson: shiftAuditsTable.expectedStockJson,
      actualStockJson: shiftAuditsTable.actualStockJson,
    })
    .from(shiftAuditsTable)
    .leftJoin(usersTable, eq(usersTable.id, shiftAuditsTable.cashierId))
    .where(branchId ? eq(shiftAuditsTable.branchId, branchId) : undefined)
    .orderBy(desc(shiftAuditsTable.createdAt));

  res.json(
    rows.map((r) => {
      const expected = (r.expectedStockJson as StockEntry[] | null) ?? [];
      const actual = (r.actualStockJson as StockEntry[] | null) ?? [];
      const { maxDiscrepancyPct } = buildReconciliation(expected, actual);
      return {
        id: r.id,
        branchId: r.branchId,
        cashierId: r.cashierId,
        cashierName: r.cashierName,
        shiftStart: r.shiftStart,
        shiftEnd: r.shiftEnd,
        photoProofUrl: r.photoProofUrl,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        maxDiscrepancyPct,
      };
    }),
  );
});

// Snapshot of current expected stock for the cashier closing a shift.
router.get("/shift-audits/expected", requireAuth, requireBranchAccess((req) => Number(req.query["branchId"] ?? 1)), async (req, res) => {
  const branchId = Number(req.query["branchId"] ?? 1);
  const inv = await listInventoryForShift(branchId);
  res.json(inv);
});

router.get("/shift-audits/:id", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select({
      id: shiftAuditsTable.id,
      branchId: shiftAuditsTable.branchId,
      cashierId: shiftAuditsTable.cashierId,
      cashierName: usersTable.name,
      shiftStart: shiftAuditsTable.shiftStart,
      shiftEnd: shiftAuditsTable.shiftEnd,
      photoProofUrl: shiftAuditsTable.photoProofUrl,
      status: shiftAuditsTable.status,
      notes: shiftAuditsTable.notes,
      createdAt: shiftAuditsTable.createdAt,
      expectedStockJson: shiftAuditsTable.expectedStockJson,
      actualStockJson: shiftAuditsTable.actualStockJson,
    })
    .from(shiftAuditsTable)
    .leftJoin(usersTable, eq(usersTable.id, shiftAuditsTable.cashierId))
    .where(eq(shiftAuditsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const expected = (row.expectedStockJson as StockEntry[] | null) ?? [];
  const actual = (row.actualStockJson as StockEntry[] | null) ?? [];
  const { reconciliation, maxDiscrepancyPct } = buildReconciliation(expected, actual);

  res.json({
    id: row.id,
    branchId: row.branchId,
    cashierId: row.cashierId,
    cashierName: row.cashierName,
    shiftStart: row.shiftStart,
    shiftEnd: row.shiftEnd,
    photoProofUrl: row.photoPro0fUrl,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    maxDiscrepancyPct,
    reconciliation,
  });
});

router.post("/shift-audits", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  const { branchId, cashierId, shiftStart, actualStock, photoProofUrl, notes } = req.body as {
    branchId: number;
    cashierId?: number | null;
    shiftStart?: string | null;
    actualStock: StockEntry[];
    photoProofUrl?: string | null;
    notes?: string | null;
  };
  if (!branchId || !Array.isArray(actualStock)) {
    res.status(400).json({ error: "branchId and actualStock are required" });
    return;
  }

  const inv = await listInventoryForBranch(branchId);
  const expected = snapshotFromInventory(inv);
  const { maxDiscrepancyPct } = buildReconciliation(expected, actualStock);
  const status = maxDiscrepancyPct > WARNING_PCT ? "discrepancy" : "pending";

  const [created] = await db
    .insert(shiftAuditsTable)
    .values({
      branchId,
      cashierId: cashierId ?? null,
      shiftStart: shiftStart ? new Date(shiftStart) : null,
      shiftEnd: new Date(),
      expectedStockJson: expected,
      actualStockJson: actualStock,
      photoProofUrl: photoProofUrl ?? null,
      status,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    branchId: created.branchId,
    cashierId: created.cashierId,
    cashierName: null,
    shiftStart: created.shiftStart,
    shiftEnd: created.shiftEnd,
    photoProofUrl: created.photoProofUrl,
    status: created.status,
    notes: created.notes,
    createdAt: created.createdAt,
    maxDiscrepancyPct,
  });
});

// Owner validates the audit: sync physical counts into live inventory
router.patch("/shift-audits/:id/verify", requireRole("owner", "manager"), async (req, res) => {
  const id = Number(req.params["id"]);

  const updated = await db.transaction(async (tx: Executor) => {
    const [audit] = await tx.select().from(shiftAuditsTable).where(eq(shiftAuditsTable.id, id));
    if (!audit) return null;

    const actual = (audit.actualStockJson as StockEntry[] | null) ?? [];
    for (const a of actual) {
      const [existing] = await tx
        .select()
        .from(currentInventoryTable)
        .where(
          and(
            eq(currentInventoryTable.branchId, audit.branchId),
            eq(currentInventoryTable.itemType, a.itemType),
            eq(currentInventoryTable.itemId, a.itemId),
          ),
        );
      if (existing) {
        await tx
          .update(currentInventoryTable)
          .set({ currentStock: String(a.quantity) })
          .where(eq(currentInventoryTable.id, existing.id));
      } else {
        await tx.insert(currentInventoryTable).values({
          branchId: audit.branchId,
          itemType: a.itemType,
          itemId: a.itemId,
          currentStock: String(a.quantity),
        });
      }
    }

    const [row] = await tx
      .update(shiftAuditsTable)
      .set({ status: "verified" })
      .where(eq(shiftAuditsTable.id, id))
      .returning();
    return row;
  });

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: updated.id,
    branchId: updated.branchId,
    cashierId: updated.cashierId,
    cashierName: null,
    shiftStart: updated.shiftStart,
    shiftEnd: updated.shiftEnd,
    photoProofUrl: updated.photoProofUrl,
    status: updated.status,
    notes: updated.notes,
    createdAt: updated.createdAt,
    maxDiscrepancyPct: 0,
  });
});

// ── FRAUD ANALYSIS ENDPOINT ──
router.get("/shift-audits/:id/analysis", requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [audit] = await db.select().from(shiftAuditsTable).where(eq(shiftAuditsTable.id, id));
    if (!audit) { res.status(404).json({ error: "Not found" }); return; }

    const expected = (audit.expectedStockJson as any[] | null) ?? [];
    const actual = (audit.actualStockJson as any[] | null) ?? [];
    if (!expected.length || !actual.length) { res.json({ shiftId: id, note: "No stock data" }); return; }

    // Get orders during shift (joining items)
    const orders = await db.select({
      id: ordersTable.id, productId: orderItemsTable.productId, variantId: orderItemsTable.productVariantId, quantity: orderItemsTable.quantity,
    }).from(orderItemsTable).innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(and(
      gte(ordersTable.createdAt, audit.shiftStart!), lte(ordersTable.createdAt, audit.shiftEnd || new Date()),
      eq(ordersTable.branchId, audit.branchId!),
    ));

    const anomalies: any[] = [];
    const ingredientMap = new Map<string, { sold: number; expected: number; items: { variant: string; sold: number; recipe: number; expected: number }[] }>();

    for (const o of orders) {
      if (!o.variantId) continue;
      const recipes = await db.select().from(recipesTable).where(and(eq(recipesTable.parentType, "product_variant"), eq(recipesTable.parentId, o.variantId!)));
      for (const r of recipes) {
        if (r.componentType !== "ingredient") continue;
        const [ing] = await db.select().from(sql`ingredients`).where(sql`id = ${r.componentId}`) as any[];
        if (!ing) continue;
        const key = ing.name || `ing_${r.componentId}`;
        const exp = parseFloat(r.quantity) * o.quantity!;
        const existing = ingredientMap.get(key);
        if (existing) {
          existing.sold += o.quantity!;
          existing.expected += exp;
          existing.items.push({ variant: `var_${o.variantId}`, sold: o.quantity!, recipe: parseFloat(r.quantity), expected: exp });
        } else {
          ingredientMap.set(key, { sold: o.quantity!, expected: exp, items: [{ variant: `var_${o.variantId}`, sold: o.quantity!, recipe: parseFloat(r.quantity), expected: exp }] });
        }
      }
    }

    for (const [ingName, data] of ingredientMap) {
      const expItem = expected.find((e: any) => e.name === ingName);
      const actItem = actual.find((a: any) => a.name === ingName);
      if (!expItem || !actItem) continue;
      const actualLoss = expItem.quantity - actItem.quantity;
      const excess = actualLoss - data.expected;
      if (Math.abs(excess) < 0.01) continue;
      const pct = data.expected > 0 ? (excess / data.expected) * 100 : 0;
      const flag = Math.abs(pct) > 20 ? "HIGH" : Math.abs(pct) > 10 ? "MEDIUM" : "LOW";
      const hpp = expItem.hpp || expItem.costPricePerUnit || 0;
      const minRecipe = Math.min(...data.items.map(i => i.recipe));
      const potentialCups = minRecipe > 0 ? Math.round(excess / minRecipe) : 0;
      const minPrice = 7000; // TODO: get actual min variant price
      const materialLoss = Math.abs(excess) * hpp;
      const potentialRevenue = potentialCups * minPrice;

      anomalies.push({
        ingredient: ingName, hpp: hpp || 0,
        totalExpected: data.expected.toFixed(2),
        totalActualLoss: actualLoss.toFixed(2),
        excessQty: excess.toFixed(2),
        excessPct: Math.abs(pct).toFixed(1),
        materialLoss: Math.round(materialLoss),
        potentialCups,
        potentialRevenue,
        flag,
        variants: data.items,
        causes: pct > 15 ? ["Porsi berlebih", "Spill/tumpah", "Kecurangan takaran"] : ["Variasi normal", "Toleransi produksi"],
      });
    }

    const totalMaterial = anomalies.reduce((s: number, a: any) => s + a.materialLoss, 0);
    const totalRevenue = anomalies.reduce((s: number, a: any) => s + a.potentialRevenue, 0);

    res.json({
      shiftId: id, branchId: audit.branchId, period: `${audit.shiftStart} — ${audit.shiftEnd}`,
      totalCups: orders.reduce((s: number, o: any) => s + (o.quantity || 0), 0),
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        totalMaterialLoss: totalMaterial,
        totalPotentialRevenue: totalRevenue,
        recommendation: anomalies.length > 0 ? "Audit SOP takaran. Cek barista & training." : "Semua dalam batas normal.",
      },
    });
  } catch (e) {
    console.error("GET /shift-audits/:id/analysis error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
