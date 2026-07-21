import { db, purchaseOrdersTable, goodsReceiptsTable, supplierInvoicesTable, suppliersTable, purchaseOrderItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { runPurchasingValidation } from "./validationEngine";

export async function getPurchasingDashboard(): Promise<any> {
  const [openPo] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrdersTable)
    .where(sql`status IN ('sent','partial')`);
  const [waitingReceipt] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.status, "sent"), sql`NOT EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.po_id = purchase_orders.id AND gr.status = 'completed')`));
  const [outstandingInv] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierInvoicesTable)
    .where(eq(supplierInvoicesTable.status, "approved"));
  const [apPending] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierInvoicesTable)
    .where(sql`status = 'approved' OR status = 'submitted'`);

  // Supplier performance: count POs per supplier
  const perf = await db.execute(sql`
    SELECT s.id, s.name, count(po.id) AS po_count, count(gr.id) AS receipt_count
    FROM suppliers s LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status IN ('completed','partial')
    LEFT JOIN goods_receipts gr ON gr.po_id = po.id
    GROUP BY s.id, s.name ORDER BY po_count DESC`);

  const [procValue] = await db.select({ total: sql<number>`COALESCE(SUM(${purchaseOrdersTable.totalAmount}), 0)` }).from(purchaseOrdersTable)
    .where(sql`status IN ('completed','partial','sent')`);
  const validation = await runPurchasingValidation();

  return {
    openPOs: openPo?.count || 0,
    goodsWaitingReceipt: waitingReceipt?.count || 0,
    outstandingInvoices: outstandingInv?.count || 0,
    apPendingPayment: apPending?.count || 0,
    supplierPerformance: perf.rows || [],
    procurementValue: Math.round((procValue?.total || 0) * 100) / 100,
    validationScore: validation.overallScore,
    validationLabel: validation.overallLabel,
  };
}

import { and } from "drizzle-orm";
