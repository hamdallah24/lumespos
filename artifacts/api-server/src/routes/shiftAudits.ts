import { Router } from "express";
import { db, shiftAuditsTable, usersTable, currentInventoryTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";
import { listInventoryForBranch, listInventoryForShift, type Executor, type ItemType } from "../services/inventory";

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

    return res.json({
      success: true,
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

export default router;
