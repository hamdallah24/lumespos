import { Router } from "express";
import { db, shiftAuditsTable, usersTable, currentInventoryTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { listInventoryForBranch, type Executor, type ItemType } from "../services/inventory";

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

router.get("/shift-audits", requireRole("owner", "manager"), async (req, res) => {
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
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
router.get("/shift-audits/expected", requireAuth, async (req, res) => {
  const branchId = Number(req.query["branchId"] ?? 1);
  const inv = await listInventoryForBranch(branchId);
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
    photoProofUrl: row.photoProofUrl,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    maxDiscrepancyPct,
    reconciliation,
  });
});

router.post("/shift-audits", requireAuth, async (req, res) => {
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

// Owner validates the audit: sync physical counts into live inventory.
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
