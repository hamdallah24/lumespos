import { Router } from "express";
import { db, shiftAuditsTable, usersTable, currentInventoryTable, stockAdjustmentsTable, ordersTable, orderItemsTable, productsTable, productVariantsTable, recipesTable, expensesTable, ingredientsTable, semiFinishedTable } from "@workspace/db";
import { and, desc, eq, sql, gte, lte } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireBranchAccess, requireRole } from "../middlewares/requireAuth";
import { listInventoryForBranch, listInventoryForShift, getRecipeRows, type ItemType } from "../services/inventory";
import { createMovement, MOVEMENT_TYPES } from "../inventory/services/movementService";
import { EventPublisher } from "../event-bus";
import { createShiftOpenedEvent, createShiftClosedEvent } from "../events";

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

function parseCupCounts(input: unknown): { s: number; m: number; l: number } | null {
  if (!input) return null;
  // If input is a JSON string (stored as text in DB), parse it first
  let obj = input;
  if (typeof input === "string") {
    try { obj = JSON.parse(input); } catch { return null; }
  }
  if (typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const cupCounts = record.cupCounts as Record<string, unknown> | undefined;
  if (cupCounts && typeof cupCounts === "object") {
    return {
      s: Number(cupCounts.s ?? 0),
      m: Number(cupCounts.m ?? 0),
      l: Number(cupCounts.l ?? 0),
    };
  }
  const single = Number(record.endingCupCount ?? record.cupCount ?? 0);
  return single > 0 ? { s: single, m: 0, l: 0 } : null;
}

function reconcileStockOpeningToClosing(opening: StockEntry[], closing: StockEntry[]) {
  const openingMap = new Map(opening.map((i) => [`${i.itemType}:${i.itemId}`, i]));
  const closingMap = new Map(closing.map((i) => [`${i.itemType}:${i.itemId}`, i]));
  const keys = new Set([...openingMap.keys(), ...closingMap.keys()]);
  const delta = Array.from(keys).map((key) => {
    const openingItem = openingMap.get(key);
    const closingItem = closingMap.get(key);
    const openingQty = openingItem?.quantity ?? 0;
    const closingQty = closingItem?.quantity ?? 0;
    const deltaQty = closingQty - openingQty;
    return {
      itemType: openingItem?.itemType ?? closingItem?.itemType ?? "ingredient",
      itemId: openingItem?.itemId ?? closingItem?.itemId ?? 0,
      name: openingItem?.name ?? closingItem?.name ?? key,
      unit: openingItem?.unit ?? closingItem?.unit ?? "pcs",
      opening: openingQty,
      closing: closingQty,
      delta: deltaQty,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return {
    opening,
    closing,
    delta,
    summary: {
      itemsTracked: delta.length,
      itemsWithChange: delta.filter((item) => Math.abs(item.delta) > 0.0001).length,
      totalQtyDelta: delta.reduce((sum, item) => sum + item.delta, 0),
    },
  };
}

function buildExecutiveSummary(params: {
  anomalies: any[];
  stockAnalysis: any;
  cupAnalysis: any;
  totalCups: number;
  totalMaterialLoss: number;
  totalPotentialRevenue: number;
}) {
  const stockDeltaItems = params.stockAnalysis?.delta?.filter((item: any) => Math.abs(item.delta) > 0.0001).length ?? 0;
  const cupGap = params.cupAnalysis?.discrepancy ?? 0;
  const highRisk = params.anomalies.some((a) => a.flag === "HIGH") || Math.abs(cupGap) > 2;
  const mediumRisk = params.anomalies.length > 0 || stockDeltaItems > 0 || Math.abs(cupGap) > 0.5;
  const severity = highRisk ? "high" : mediumRisk ? "medium" : "low";
  const verdict = severity === "high" ? "Perlu Tindakan Segera" : severity === "medium" ? "Waspada" : "Normal";
  const headline = severity === "high"
    ? "Ada potensi kehilangan atau penyimpangan serius pada shift ini."
    : severity === "medium"
      ? "Ada beberapa sinyal yang perlu dipantau lebih dekat."
      : "Operasional shift secara umum konsisten dan tidak ada anomali besar.";

  const keyPoints = [
    `${params.anomalies.length} temuan anomali bahan baku`,
    `${stockDeltaItems} item stok mengalami perubahan sejak awal shift`,
    `Cup terjual ${params.totalCups} unit${Math.abs(cupGap) > 0.5 ? `, selisih ${cupGap > 0 ? "+" : ""}${cupGap} unit` : ""}`,
  ].filter(Boolean);

  const recommendation = severity === "high"
    ? "Lakukan review langsung ke kasir, barista, dan bukti fisik sebelum verifikasi akhir."
    : severity === "medium"
      ? "Cek ulang pencatatan takaran, stok fisik, dan cup sebelum verifikasi."
      : "Monitor rutin tetap berjalan dan lanjutkan SOP standar.";

  return {
    verdict,
    severity,
    headline,
    keyPoints,
    recommendation,
    metrics: {
      anomalyCount: params.anomalies.length,
      totalMaterialLoss: params.totalMaterialLoss,
      totalPotentialRevenue: params.totalPotentialRevenue,
      stockDeltaItems,
      cupDiscrepancy: cupGap,
      totalCups: params.totalCups,
    },
  };
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
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status = 'completed' THEN total ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method = 'qris' AND status = 'completed' THEN total ELSE 0 END), 0) as qris,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status = 'completed' THEN total ELSE 0 END), 0) as card,
        COUNT(*) FILTER (WHERE status = 'completed') as total_orders,
        COUNT(*) FILTER (WHERE status = 'voided') as voided_count,
        COALESCE(SUM(CASE WHEN status = 'voided' THEN total ELSE 0 END), 0) as voided_total
      FROM orders 
      WHERE branch_id = ${shift.branchId}
        AND created_at >= ${shift.shiftStart}
    `);

    const firstRow = result.rows[0] as any;
    const cashTotal = firstRow ? parseFloat(firstRow.cash || 0) : 0;
    const qrisTotal = firstRow ? parseFloat(firstRow.qris || 0) : 0;
    const cardTotal = firstRow ? parseFloat(firstRow.card || 0) : 0;

    // Hitung total cup terjual
    const [cupResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)` })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(and(gte(ordersTable.createdAt, shift.shiftStart!), eq(ordersTable.branchId, shift.branchId)));

    return res.json({
      cash: cashTotal,
      qris: qrisTotal,
      card: cardTotal,
      total: cashTotal + qrisTotal + cardTotal,
      totalOrders: firstRow ? parseInt(firstRow.total_orders || 0) : 0,
      voidedCount: firstRow ? parseInt(firstRow.voided_count || 0) : 0,
      voidedTotal: firstRow ? parseFloat(firstRow.voided_total || 0) : 0,
      totalCups: cupResult ? parseInt(cupResult.total || "0") : 0,
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
    const existingShifts = await db
      .select()
      .from(shiftAuditsTable)
      .where(
        and(
          eq(shiftAuditsTable.branchId, branchId),
          eq(shiftAuditsTable.status, "active")
        )
      );

    // Auto-close stale shifts from previous calendar days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const es of existingShifts) {
      const shiftDate = es.shiftStart ? new Date(es.shiftStart) : null;
      if (shiftDate && shiftDate < today) {
        await db
          .update(shiftAuditsTable)
          .set({
            status: "confirmed",
            shiftEnd: today,
            notes: (es.notes ? es.notes + " | " : "") + "Auto-closed: daily reset",
          })
          .where(eq(shiftAuditsTable.id, es.id));
        EventPublisher.publish(createShiftClosedEvent({
          shiftId: es.id,
          branchId,
          status: "auto-closed",
          expectedBalance: parseFloat(es.openingBalance || "0"),
          closingBalance: parseFloat(es.openingBalance || "0"),
          difference: 0,
        }));
      }
    }

    // Re-check: masih ada shift aktif HARI INI?
    const todaysActive = await db
      .select()
      .from(shiftAuditsTable)
      .where(
        and(
          eq(shiftAuditsTable.branchId, branchId),
          eq(shiftAuditsTable.status, "active")
        )
      )
      .limit(1);

    if (todaysActive.length > 0) {
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

    EventPublisher.publish(createShiftOpenedEvent({
      shiftId: newShift.id,
      branchId,
      cashierId: cashierId ?? 0,
      openingBalance: openingBalance ?? 0,
    }));

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
    const { shiftId, closingBalance, photoProofUrl, actualStock, notes, cupCounts } = req.body;

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

    const windowEnd = new Date();
    const [cashSales] = await db
      .select({ totalCash: sql<string>`COALESCE(SUM(total), 0)` })
      .from(sql`orders`)
      .where(
        and(
          eq(sql`branch_id`, shift.branchId),
          eq(sql`payment_method`, "cash"),
          sql`created_at >= ${shift.shiftStart}`,
          sql`created_at <= ${windowEnd}`,
          eq(sql`status`, "completed")
        )
      );

    const qrisCardResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total ELSE 0 END), 0) as qris,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card
      FROM orders
      WHERE branch_id = ${shift.branchId}
        AND created_at >= ${shift.shiftStart}
        AND created_at <= ${windowEnd}
        AND status = 'completed'
    `);
    const qrisCardRow = qrisCardResult.rows[0] as any;
    const totalQris = qrisCardRow ? parseFloat(qrisCardRow.qris || "0") : 0;
    const totalCard = qrisCardRow ? parseFloat(qrisCardRow.card || "0") : 0;

    const [expenseResult] = await db
      .select({ totalExpenses: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.branchId, shift.branchId),
          sql`${expensesTable.createdAt} >= ${shift.shiftStart}`,
          sql`${expensesTable.createdAt} <= ${windowEnd}`,
        )
      );

    const totalCash = parseFloat(cashSales?.totalCash || "0");
    const totalExpenses = parseFloat(expenseResult?.totalExpenses || "0");
    const expectedBalance = parseFloat(shift.openingBalance) + totalCash - totalExpenses;
    const difference = closingBalance - expectedBalance;
    let status = difference !== 0 ? "discrepancy" : "pending";

    // Hitung void dalam shift ini
    const [voidResult] = await db
      .select({
        voidedCount: sql<string>`COUNT(*)`,
        voidedTotal: sql<string>`COALESCE(SUM(total), 0)`,
      })
      .from(sql`orders`)
      .where(
        and(
          eq(sql`branch_id`, shift.branchId),
          sql`created_at >= ${shift.shiftStart}`,
          sql`created_at <= ${windowEnd}`,
          eq(sql`status`, "voided"),
        ),
      );
    const totalVoided = voidResult ? parseFloat(voidResult.voidedTotal || "0") : 0;
    const totalVoidedCount = voidResult ? parseInt(voidResult.voidedCount || "0") : 0;

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
    const cupS = cupCounts ? (Number(cupCounts.s) || 0) : 0;
    const cupM = cupCounts ? (Number(cupCounts.m) || 0) : 0;
    const cupL = cupCounts ? (Number(cupCounts.l) || 0) : 0;
    const cupTotal = cupS + cupM + cupL;
    const notesObj = { closingBalance, expectedBalance, difference, totalCash, totalQris, totalCard, voidedCount: totalVoidedCount, voidedTotal: totalVoided, userNotes: notes || null, cupCounts: cupTotal > 0 ? { s: cupS, m: cupM, l: cupL } : undefined };

    // ── Cup tracking ──
    let startingCupCount = 0;
    if (cupTotal > 0) {
      const [prevShift] = await db
        .select({ ec: shiftAuditsTable.endingCupCount })
        .from(shiftAuditsTable)
        .where(and(eq(shiftAuditsTable.branchId, shift.branchId), sql`${shiftAuditsTable.id} < ${shiftId}`))
        .orderBy(sql`${shiftAuditsTable.id} DESC`)
        .limit(1);
      startingCupCount = prevShift ? parseFloat(prevShift.ec || "0") : 0;
    }

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
        endingCupCount: cupTotal > 0 ? String(cupTotal) : null,
      })
      .where(eq(shiftAuditsTable.id, shiftId))
      .returning();

    // ── AUTO-CORRECTION: koreksi inventory dari selisih expected vs actual ──
    let correction: { corrected: number; details: { item: string; diff: number; type: string }[] } | null = null;
    if (expectedStock && Array.isArray(actualStock) && actualStock.length > 0) {
      const details: { item: string; diff: number; type: string }[] = [];
      let corrected = 0;
      const errors: string[] = [];
      for (const item of expectedStock) {
        const actual = (actualStock as any[]).find((a: any) => a.name === item.name);
        if (!actual) continue;
        const diff = actual.quantity - item.quantity;
        if (Math.abs(diff) < 0.01) continue;

        const movementType = diff > 0 ? MOVEMENT_TYPES.STOCK_OPNAME : MOVEMENT_TYPES.WASTE_DAMAGE;
        const qty = Math.abs(diff);
        let unitCost: number | undefined;
        if (diff > 0) {
          if (item.itemType === "ingredient") {
            const [row] = await db.select({ c: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, item.itemId));
            unitCost = row ? parseFloat(row.c) : undefined;
          } else if (item.itemType === "semi_finished") {
            const [row] = await db.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, item.itemId));
            unitCost = row ? parseFloat(row.c) : undefined;
          }
        }
        try {
          await createMovement({
            branchId: shift.branchId,
            itemType: item.itemType,
            itemId: item.itemId,
            movementType,
            quantity: qty,
            unitCost,
            referenceType: "shift_audit",
            referenceId: shiftId,
            description: `Auto-koreksi dari tutup shift #${shiftId}`,
            itemName: item.name,
          });
        } catch (mvErr: any) {
          console.error(`[Shift] Movement failed for ${item.name}:`, mvErr.message);
          errors.push(`${item.name}: ${mvErr.message}`);
          continue;
        }

        await db.insert(stockAdjustmentsTable).values({
          branchId: shift.branchId, itemType: item.itemType, itemId: item.itemId,
          adjustmentType: diff < 0 ? "loss" : "in",
          quantity: String(Math.abs(diff)),
          notes: `Auto-koreksi dari tutup shift #${shiftId}`,
        });
        details.push({ item: item.name, diff: Number(diff.toFixed(2)), type: diff < 0 ? "loss" : "in" });
        corrected++;
      }
      if (errors.length > 0) {
        console.error(`[Shift] ${errors.length} item(s) gagal dikoreksi:`, errors.join("; "));
      }
      if (corrected > 0) {
        correction = { corrected, details };
        await db.update(shiftAuditsTable)
          .set({ status: "corrected" })
          .where(eq(shiftAuditsTable.id, shiftId));
      }
    }

    EventPublisher.publish(createShiftClosedEvent({
      shiftId: updatedShift.id,
      branchId: shift.branchId,
      status: updatedShift.status,
      expectedBalance,
      closingBalance,
      difference,
    }));

    return res.json({
      success: true,
      ...(correction ? { autoCorrection: correction } : {}),
      shift: {
        id: updatedShift.id,
        expectedBalance,
        closingBalance,
        difference,
        startingCupCount,
        endingCupCount: cupTotal,
        totalCash,
        totalQris,
        totalCard,
        voidedCount: totalVoidedCount,
        voidedTotal: totalVoided,
      }
    });

    // Fire-and-forget: COO analysis via LLM langsung
    (async () => {
      try {
        const { executiveReason } = await import("../ai/runtime/execution/ExecutiveReasoner");
        const voidRow = await db.select({ count: sql<string>`COUNT(*)`, total: sql<string>`COALESCE(SUM(total), 0)` })
          .from(ordersTable)
          .where(and(eq(ordersTable.branchId, shift.branchId!), gte(ordersTable.createdAt, shift.shiftStart ?? new Date(0)), lte(ordersTable.createdAt, updatedShift.shiftEnd ?? new Date()), eq(ordersTable.status, "voided")));
        const voidCount = parseInt(voidRow[0]?.count || "0");
        const voidTotal = parseFloat(voidRow[0]?.total || "0");
        const stockLines = (expectedStock ?? []).map((e: any) => {
          const a = (actualStock ?? []).find((x: any) => x.name === e.name);
          const diff = a ? a.quantity - e.quantity : 0;
          return `${e.name}: expected ${e.quantity.toFixed(1)} ${e.unit}, actual ${a ? a.quantity.toFixed(1) : '0'} ${e.unit}, diff ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;
        }).join('\n') || 'Tidak ada';
        const prompt = `Kamu adalah COO Lume's Everywhere. Analisis laporan shift secara natural:

ID Shift: ${updatedShift.id}
Cabang: ${shift.branchId}
Revenue: Rp ${(totalCash + totalQris + totalCard).toLocaleString('id-ID')}
Pesanan: ${cupTotal} cup, ${voidCount} void (Rp ${voidTotal.toLocaleString('id-ID')})
Kas: awal Rp ${parseFloat(shift.openingBalance).toLocaleString('id-ID')}, akhir Rp ${closingBalance.toLocaleString('id-ID')}, selisih Rp ${Math.abs(difference).toLocaleString('id-ID')}
Selisih stok:
${stockLines}

Evaluasi shift ini. Sorot anomali. Beri rekomendasi. Bahasa Indonesia natural.`;
        const llmResult = await executiveReason({ persona: "", context: prompt, userId: 0 });
        if (llmResult.content && !llmResult.content.startsWith("ERROR")) {
          await db.update(shiftAuditsTable).set({ cooAnalysis: llmResult.content }).where(eq(shiftAuditsTable.id, updatedShift.id));
        }
      } catch (e) { console.error("[COO] Analysis error:", e); }
    })();

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
      openingBalance: shiftAuditsTable.openingBalance,
      closingBalance: shiftAuditsTable.closingBalance,
      expectedBalance: shiftAuditsTable.expectedBalance,
      endingCupCount: shiftAuditsTable.endingCupCount,
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
      let moneyNote: any = null;
      if (r.notes) { try { moneyNote = JSON.parse(r.notes); } catch { moneyNote = { raw: r.notes }; } }
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
        openingBalance: r.openingBalance ? parseFloat(r.openingBalance) : 0,
        closingBalance: r.closingBalance ? parseFloat(r.closingBalance) : null,
        expectedBalance: r.expectedBalance ? parseFloat(r.expectedBalance) : null,
        difference: moneyNote?.difference ?? null,
        totalCash: moneyNote?.totalCash ?? null,
        totalQris: moneyNote?.totalQris ?? null,
        totalCard: moneyNote?.totalCard ?? null,
        voidedCount: moneyNote?.voidedCount ?? null,
        voidedTotal: moneyNote?.voidedTotal ?? null,
        endingCupCount: r.endingCupCount ? parseFloat(r.endingCupCount) : null,
        createdAt: r.createdAt,
        maxDiscrepancyPct,
        cooAnalysis: (r as any).cooAnalysis ?? null,
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
      openingBalance: shiftAuditsTable.openingBalance,
      closingBalance: shiftAuditsTable.closingBalance,
      expectedBalance: shiftAuditsTable.expectedBalance,
      endingCupCount: shiftAuditsTable.endingCupCount,
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
  const shiftStart = row.shiftStart ? new Date(row.shiftStart) : null;
  const shiftEnd = row.shiftEnd ? new Date(row.shiftEnd) : new Date();
  const [expenseResult] = shiftStart
    ? await db
        .select({ totalExpenses: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(expensesTable)
        .where(
          and(
            eq(expensesTable.branchId, row.branchId),
            sql`${expensesTable.createdAt} >= ${shiftStart}`,
            sql`${expensesTable.createdAt} <= ${shiftEnd}`,
          )
        )
    : [{ totalExpenses: "0" }];
  const totalExpenses = parseFloat(expenseResult?.totalExpenses || "0");

  let moneyNote: any = null;
  if (row.notes) { try { moneyNote = JSON.parse(row.notes); } catch { moneyNote = { raw: row.notes }; } }

  // Hitung void dalam shift ini
  const [voidResult] = await db
    .select({
      voidedCount: sql<string>`COUNT(*)`,
      voidedTotal: sql<string>`COALESCE(SUM(total), 0)`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.branchId, row.branchId),
        gte(ordersTable.createdAt, row.shiftStart ?? new Date(0)),
        lte(ordersTable.createdAt, row.shiftEnd ?? new Date()),
        eq(ordersTable.status, "voided"),
      ),
    );

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
    openingBalance: row.openingBalance ? parseFloat(row.openingBalance) : 0,
    closingBalance: row.closingBalance ? parseFloat(row.closingBalance) : null,
    expectedBalance: row.expectedBalance ? parseFloat(row.expectedBalance) : null,
    difference: moneyNote?.difference ?? null,
    totalCash: moneyNote?.totalCash ?? null,
    totalQris: moneyNote?.totalQris ?? null,
    totalCard: moneyNote?.totalCard ?? null,
    voidedCount: voidResult ? parseInt(voidResult.voidedCount || "0") : 0,
    voidedTotal: voidResult ? parseFloat(voidResult.voidedTotal || "0") : 0,
    totalExpenses,
    endingCupCount: row.endingCupCount ? parseFloat(row.endingCupCount) : null,
    createdAt: row.createdAt,
    maxDiscrepancyPct,
    reconciliation,
    cooAnalysis: (row as any).cooAnalysis ?? null,
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

  const [audit] = await db.select().from(shiftAuditsTable).where(eq(shiftAuditsTable.id, id));
  if (!audit) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const actual = (audit.actualStockJson as StockEntry[] | null) ?? [];
  const errors: string[] = [];

  for (const a of actual) {
    const [existing] = await db
      .select({ currentStock: currentInventoryTable.currentStock })
      .from(currentInventoryTable)
      .where(
        and(
          eq(currentInventoryTable.branchId, audit.branchId),
          eq(currentInventoryTable.itemType, a.itemType),
          eq(currentInventoryTable.itemId, a.itemId),
        ),
      );

    const currentStock = existing ? parseFloat(existing.currentStock) : 0;
    const delta = a.quantity - currentStock;
    if (Math.abs(delta) < 0.01) continue;

    const movementType = delta > 0 ? MOVEMENT_TYPES.STOCK_OPNAME : MOVEMENT_TYPES.WASTE_DAMAGE;
    const qty = Math.abs(delta);
    let unitCost: number | undefined;
    if (delta > 0) {
      if (a.itemType === "ingredient") {
        const [row] = await db.select({ c: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, a.itemId));
        unitCost = row ? parseFloat(row.c) : undefined;
      } else if (a.itemType === "semi_finished") {
        const [row] = await db.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, a.itemId));
        unitCost = row ? parseFloat(row.c) : undefined;
      }
    }
    try {
      await createMovement({
        branchId: audit.branchId,
        itemType: a.itemType,
        itemId: a.itemId,
        movementType,
        quantity: qty,
        unitCost,
        referenceType: "shift_audit_verify",
        referenceId: id,
        description: `Owner verify shift #${id} — ${a.name}`,
      });
    } catch (mvErr: any) {
      console.error(`[Verify] Movement failed for ${a.name}:`, mvErr.message);
      errors.push(`${a.name}: ${mvErr.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`[Verify] ${errors.length} item(s) gagal:`, errors.join("; "));
  }

  const [updated] = await db
    .update(shiftAuditsTable)
    .set({ status: "verified" })
    .where(eq(shiftAuditsTable.id, id))
    .returning();

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

    // Get orders with product/variant info, excluding voided
    const orders = await db.select({
      qty: orderItemsTable.quantity,
      productId: orderItemsTable.productId,
      variantId: orderItemsTable.productVariantId,
      variantName: productVariantsTable.name,
      productName: productsTable.name,
    }).from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .leftJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
      .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
      .where(and(
        gte(ordersTable.createdAt, audit.shiftStart!), lte(ordersTable.createdAt, audit.shiftEnd || new Date()),
        eq(ordersTable.branchId, audit.branchId!),
        sql`${ordersTable.status} != 'voided'`,
      ));

    const totalCups = orders.reduce((s: number, o: any) => s + (o.qty || 0), 0);

    // ── Step 1: Build ingredient map (handle BOTH variants and non-variant products) ──
    const ingredientMap = new Map<string, {
      sold: number; expected: number;
      variants: Map<string, { sold: number; recipe: number; expected: number; variantName: string }>;
    }>();

    // Collect unique recipe lookups to batch them
    type RecipeLookup = { parentType: "product_variant" | "product"; parentId: number };
    const recipeKeys = new Set<string>();
    const recipeLookups: RecipeLookup[] = [];
    for (const o of orders) {
      if (!o.productId) continue;
      const key = o.variantId ? `product_variant:${o.variantId}` : `product:${o.productId}`;
      if (!recipeKeys.has(key)) {
        recipeKeys.add(key);
        recipeLookups.push({
          parentType: o.variantId ? "product_variant" : "product",
          parentId: o.variantId ?? o.productId,
        });
      }
    }

    // Load ALL recipes in batch with fallback
    const recipeCache = new Map<string, { componentType: string; componentId: number; quantity: number }[]>();
    for (const rk of recipeLookups) {
      const rows = await getRecipeRows(db as any, rk.parentType, rk.parentId);
      if (rows.length === 0 && rk.parentType === "product_variant") {
        // Fallback: variant tanpa resep → pakai resep produk induk
        const [prod] = await db
          .select({ pid: productsTable.id })
          .from(productsTable)
          .innerJoin(productVariantsTable, eq(productVariantsTable.productId, productsTable.id))
          .where(eq(productVariantsTable.id, rk.parentId))
          .limit(1);
        if (prod) {
          const fallback = await getRecipeRows(db as any, "product", prod.pid);
          recipeCache.set(`product_variant:${rk.parentId}`, fallback);
        }
      } else {
        recipeCache.set(`${rk.parentType}:${rk.parentId}`, rows);
      }
    }

    // Build ingredient map from orders + cached recipes
    for (const o of orders) {
      if (!o.productId) continue;
      const key = o.variantId ? `product_variant:${o.variantId}` : `product:${o.productId}`;
      const recipes = recipeCache.get(key) ?? [];
      for (const r of recipes) {
        if (r.componentType !== "ingredient") continue;
        const [ing] = await db.select().from(sql`ingredients`).where(sql`id = ${r.componentId}`) as any[];
        if (!ing) continue;
        const ingKey = ing.name || `ing_${r.componentId}`;
        const exp = r.quantity * (o.qty!);
        const vName = o.variantName || o.productName || `var_${o.variantId || o.productId}`;
        const existing = ingredientMap.get(ingKey);
        if (existing) {
          existing.sold += o.qty!;
          existing.expected += exp;
          const ve = existing.variants.get(vName);
          if (ve) { ve.sold += o.qty!; ve.expected += exp; }
          else { existing.variants.set(vName, { sold: o.qty!, recipe: r.quantity, expected: exp, variantName: vName }); }
        } else {
          ingredientMap.set(ingKey, {
            sold: o.qty!, expected: exp,
            variants: new Map([[vName, { sold: o.qty!, recipe: r.quantity, expected: exp, variantName: vName }]]),
          });
        }
      }
    }

    // ── Step 2: Get min product price from DB ──
    const [minP] = await db.select({ p: sql<string>`MIN(price)` }).from(productsTable).where(eq(productsTable.isActive, true));
    const minPrice = minP ? parseFloat(minP.p) : 7000;

    // ── Step 3: Opening stock — use openingStockJson (new) or fallback to expectedStockJson (old) ──
    // openingStockJson was saved at shift start (my fix). For old shifts, fallback is expectedStockJson.
    const openingStockBaseline = (audit.openingStockJson as any[] | null)
      ?? (audit.expectedStockJson as any[] | null)
      ?? [];

    // ── Step 4: Per-ingredient fraud analysis ──
    // Formula: actualShortage = openingStock - physicalCount
    //          expectedConsumption = sum of recipe qty from orders
    //          excess = actualShortage - expectedConsumption
    // positive excess = more stock used than recipe says → possible theft/spillage
    const anomalies: any[] = [];
    for (const [ingName, data] of ingredientMap) {
      const openItem = openingStockBaseline.find((e: any) => e.name === ingName);
      const actItem = actual.find((a: any) => a.name === ingName);
      if (!openItem || !actItem) continue;
      const actualShortage = openItem.quantity - actItem.quantity;
      const excess = actualShortage - data.expected;
      if (Math.abs(excess) < 0.01) continue;
      const pct = data.expected > 0 ? (excess / data.expected) * 100 : 0;
      const flag = Math.abs(pct) > 20 ? "HIGH" : Math.abs(pct) > 10 ? "MEDIUM" : "LOW";
      const hpp = openItem.hpp || openItem.costPricePerUnit || 0;

      const variantArr = [...data.variants.values()];
      const totalSold = variantArr.reduce((s, v) => s + v.sold, 0);
      const weightedRecipe = totalSold > 0 ? variantArr.reduce((s, v) => s + (v.sold / totalSold) * v.recipe, 0) : variantArr[0]?.recipe || 1;
      const potentialCups = weightedRecipe > 0 ? Math.round(excess / weightedRecipe) : 0;
      const materialLoss = Math.abs(excess) * hpp;
      const potentialRevenue = potentialCups * minPrice;

      const variantAnalysis = variantArr.map(v => {
        const pot = v.recipe > 0 ? Math.round(excess / v.recipe) : 0;
        const ilegalRatio = v.sold > 0 ? (pot / v.sold) * 100 : 0;
        return {
          variant: v.variantName, recipePerCup: v.recipe, sold: v.sold,
          totalExpected: v.expected.toFixed(2), potentialIlegalCups: pot,
          ilegalRatio: ilegalRatio.toFixed(0), flag2: ilegalRatio > 50 ? "HIGH" : ilegalRatio > 30 ? "MEDIUM" : "LOW",
        };
      }).sort((a, b) => parseFloat(b.ilegalRatio) - parseFloat(a.ilegalRatio));

      anomalies.push({
        ingredient: ingName, hpp: hpp || 0, totalExpected: data.expected.toFixed(2),
        actualShortage: actualShortage.toFixed(2), excessQty: excess.toFixed(2),
        excessPct: Math.abs(pct).toFixed(1), materialLoss: Math.round(materialLoss),
        potentialCups, potentialRevenue, flag, weightedRecipe: weightedRecipe.toFixed(2),
        variantAnalysis,
        causes: pct > 15 ? ["Porsi berlebih", "Spill/tumpah", "Kecurangan takaran"] : ["Variasi normal", "Toleransi produksi"],
      });
    }

    // ── Step 5: Cup cross-check per 3 ukuran ──
    // Read per-category cup counts from notes (stored as JSON), fallback to old single numeric
    let cupBySize: { s: number; m: number; l: number } | null = null;
    if (audit.notes) {
      try {
        const n = JSON.parse(audit.notes);
        if (n.cupCounts) cupBySize = { s: Number(n.cupCounts.s) || 0, m: Number(n.cupCounts.m) || 0, l: Number(n.cupCounts.l) || 0 };
      } catch {}
    }
    const [prevShift] = await db
      .select({
        ec: shiftAuditsTable.endingCupCount,
        notes: shiftAuditsTable.notes,
        actualStockJson: shiftAuditsTable.actualStockJson,
        expectedStockJson: shiftAuditsTable.expectedStockJson,
      })
      .from(shiftAuditsTable)
      .where(and(eq(shiftAuditsTable.branchId, audit.branchId!), sql`${shiftAuditsTable.id} < ${id}`))
      .orderBy(sql`${shiftAuditsTable.id} DESC`).limit(1);
    const openingCupCounts = parseCupCounts(prevShift?.notes) ?? { s: 0, m: 0, l: 0 };
    const closingCupCounts = cupBySize ?? { s: 0, m: 0, l: 0 };
    const startingCups = prevShift?.ec ? parseFloat(prevShift.ec) : (openingCupCounts.s + openingCupCounts.m + openingCupCounts.l);
    const endingCupCount = audit.endingCupCount ? parseFloat(audit.endingCupCount) : (closingCupCounts.s + closingCupCounts.m + closingCupCounts.l);
    const actualCupUsed = startingCups - endingCupCount;
    const cupDiscrepancy = actualCupUsed - totalCups;
    const cupStatus = Math.abs(cupDiscrepancy) < 1 ? "OK — cup sesuai" : "SELISIH";

    const openingStock = (audit.openingStockJson as any[] | null)
      ?? (prevShift?.actualStockJson as any[] | null)
      ?? (prevShift?.expectedStockJson as any[] | null)
      ?? [];
    const stockAnalysis = reconcileStockOpeningToClosing(openingStock, actual);

    const cupAnalysis: any = {
      start: { s: openingCupCounts.s, m: openingCupCounts.m, l: openingCupCounts.l, total: startingCups },
      end: { s: closingCupCounts.s, m: closingCupCounts.m, l: closingCupCounts.l, total: endingCupCount },
      sold: totalCups,
      actualUsed: actualCupUsed,
      discrepancy: cupDiscrepancy,
      status: cupStatus,
      source: "stok fisik cup awal/akhir shift",
    };

    const ingredientCups = anomalies.reduce((s, a) => s + (a.potentialCups || 0), 0);
    const cupVsIngredient = ingredientCups > 0 && cupAnalysis.discrepancy !== null ?
      (Math.abs(cupAnalysis.discrepancy) < ingredientCups * 0.5 ? "⚠️ MENcurigakan — cup selisih kecil tapi bahan loss besar" :
       "Pantau — kemungkinan lupa input order") : "Normal";
    cupAnalysis.ingredientCups = ingredientCups;
    cupAnalysis.cupVsIngredient = cupVsIngredient;

    const totalMaterial = anomalies.reduce((s: number, a: any) => s + a.materialLoss, 0);
    const totalRevenue = anomalies.reduce((s: number, a: any) => s + a.potentialRevenue, 0);
    const executiveSummary = buildExecutiveSummary({
      anomalies,
      stockAnalysis,
      cupAnalysis,
      totalCups,
      totalMaterialLoss: totalMaterial,
      totalPotentialRevenue: totalRevenue,
    });

    res.json({
      shiftId: id, branchId: audit.branchId, period: `${audit.shiftStart} — ${audit.shiftEnd}`,
      totalCups,
      stockAnalysis,
      cupAnalysis,
      anomalies,
      executiveSummary,
      summary: {
        totalAnomalies: anomalies.length, totalMaterialLoss: totalMaterial, totalPotentialRevenue: totalRevenue,
        recommendation: executiveSummary.recommendation,
        executiveSummary,
      },
    });
  } catch (e) {
    console.error("GET /shift-audits/:id/analysis error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
