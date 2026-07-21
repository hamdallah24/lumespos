import { db, supplierInvoicesTable, goodsReceiptsTable, purchaseOrdersTable, suppliersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function runPurchasingValidation(): Promise<any> {
  const checks: any[] = [];

  // 1. Duplicate Invoice
  const dupResult = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM supplier_invoices WHERE status != 'voided'
    GROUP BY invoice_number HAVING count(*) > 1`);
  const dupCount = dupResult?.rows?.length || 0;
  checks.push({ name: "Duplicate Invoice", status: dupCount === 0 ? "passed" : "failed", count: dupCount, detail: `${dupCount} duplicate invoice numbers` });

  // 2. Invoice without PO
  const [invNoPo] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierInvoicesTable)
    .where(sql`NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = supplier_invoices.po_id)`);
  checks.push({ name: "Invoice without PO", status: (invNoPo?.count || 0) === 0 ? "passed" : "failed", count: invNoPo?.count || 0, detail: `${invNoPo?.count || 0} invoices without valid PO` });

  // 3. Invoice without Goods Receipt
  const [invNoGr] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierInvoicesTable)
    .where(sql`NOT EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.po_id = supplier_invoices.po_id AND gr.status = 'completed')`);
  checks.push({ name: "Invoice without GR", status: (invNoGr?.count || 0) === 0 ? "passed" : "warning", count: invNoGr?.count || 0, detail: `${invNoGr?.count || 0} invoices without completed goods receipt` });

  // 4. Supplier mismatch (invoice supplier != PO supplier)
  const supResult = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM supplier_invoices si
    JOIN purchase_orders po ON po.id = si.po_id
    WHERE si.supplier_id != po.supplier_id AND si.status != 'voided'`);
  const supMisCount = supResult?.rows?.[0]?.cnt || 0;
  checks.push({ name: "Supplier Mismatch", status: supMisCount === 0 ? "passed" : "failed", count: supMisCount, detail: `${supMisCount} invoices with supplier mismatch` });

  // 5. PO without receipt (sent but no GR)
  const [poNoGr] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.status, "sent"), sql`NOT EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.po_id = purchase_orders.id AND gr.status = 'completed')`));
  checks.push({ name: "Open PO without Receipt", status: (poNoGr?.count || 0) === 0 ? "passed" : "info", count: poNoGr?.count || 0, detail: `${poNoGr?.count || 0} sent POs without goods receipt` });

  // 6. Duplicate GRN
  const dupGrResult = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM goods_receipts WHERE status != 'voided'
    GROUP BY gr_number HAVING count(*) > 1`);
  const dupGrCount = dupGrResult?.rows?.length || 0;
  checks.push({ name: "Duplicate GRN", status: dupGrCount === 0 ? "passed" : "failed", count: dupGrCount, detail: `${dupGrCount} duplicate GR numbers` });

  const passed = checks.filter(c => c.status === "passed").length;
  const score = Math.round(checks.reduce((s, c) => s + (c.status === "passed" ? 100 : c.status === "info" ? 75 : c.status === "warning" ? 50 : 0), 0) / checks.length);

  return { checks, totalChecks: checks.length, passedChecks: passed, overallScore: score, overallLabel: score >= 80 ? "Good" : score >= 50 ? "Needs Attention" : "Critical" };
}

import { and } from "drizzle-orm";
