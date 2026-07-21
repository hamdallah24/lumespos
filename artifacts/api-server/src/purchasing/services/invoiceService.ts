import { db, supplierInvoicesTable, purchaseOrdersTable, purchaseOrderItemsTable, goodsReceiptsTable, goodsReceiptItemsTable, purchaseEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

interface ThreeWayMatchResult {
  status: "passed" | "failed";
  errors: string[];
}

async function threeWayMatch(poId: number, invoiceData: { totalAmount: number; supplierId: number }): Promise<ThreeWayMatchResult> {
  const errors: string[] = [];
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
  if (!po) { errors.push("PO not found"); return { status: "failed", errors }; }

  if (po.supplierId !== invoiceData.supplierId) {
    errors.push(`Supplier mismatch: PO supplier ${po.supplierId} vs invoice supplier ${invoiceData.supplierId}`);
  }

  const poItems = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, poId));
  const grs = await db.select().from(goodsReceiptsTable).where(and(eq(goodsReceiptsTable.poId, poId), eq(goodsReceiptsTable.status, "completed")));

  if (grs.length === 0) {
    errors.push("No goods receipt found for this PO");
  } else {
    let totalReceived = 0;
    for (const gr of grs) {
      const grItems = await db.select().from(goodsReceiptItemsTable).where(eq(goodsReceiptItemsTable.receiptId, gr.id));
      for (const item of grItems) totalReceived += parseFloat(item.totalCost);
    }
    const tolerance = 0.05; // 5% tolerance
    const diff = Math.abs(invoiceData.totalAmount - totalReceived);
    if (diff / (totalReceived || 1) > tolerance) {
      errors.push(`Amount mismatch: received ${totalReceived}, invoiced ${invoiceData.totalAmount} (diff ${(diff/(totalReceived||1)*100).toFixed(1)}%)`);
    }

    // Check all PO items have been received
    for (const poItem of poItems) {
      const ordered = parseFloat(poItem.quantityOrdered);
      const received = parseFloat(poItem.quantityReceived);
      if (received < ordered) {
        errors.push(`Item ${poItem.itemType}#${poItem.itemId}: ordered ${ordered}, received ${received} — under-received`);
      }
    }
  }

  return { status: errors.length === 0 ? "passed" : "failed", errors };
}

export async function createInvoice(data: {
  invoiceNumber: string; supplierId: number; poId: number; invoiceDate: string;
  dueDate?: string; totalAmount: number; notes?: string; createdBy?: number;
}): Promise<any> {
  const match = await threeWayMatch(data.poId, { totalAmount: data.totalAmount, supplierId: data.supplierId });

  const [inv] = await db.insert(supplierInvoicesTable).values({
    invoiceNumber: data.invoiceNumber, supplierId: data.supplierId, poId: data.poId,
    invoiceDate: data.invoiceDate, dueDate: data.dueDate,
    totalAmount: String(data.totalAmount), notes: data.notes,
    status: "submitted", threeWayMatchStatus: match.status,
    createdBy: data.createdBy,
  }).returning();

  await db.insert(purchaseEventsTable).values({
    eventType: "invoice.created", aggregateType: "supplier_invoice", aggregateId: inv.id,
    data: { invoiceNumber: data.invoiceNumber, poId: data.poId, totalAmount: data.totalAmount, threeWayMatch: match.status, errors: match.errors },
  });

  return { ...inv, threeWayMatch: match };
}

export async function approveInvoice(invoiceId: number, userId?: number): Promise<any> {
  const [inv] = await db.select().from(supplierInvoicesTable).where(eq(supplierInvoicesTable.id, invoiceId));
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "submitted") throw new Error(`Cannot approve invoice with status ${inv.status}`);

  // Re-run three-way match on approval
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, inv.poId));
  if (!po) throw new Error("PO not found");

  const match = await threeWayMatch(inv.poId, { totalAmount: parseFloat(inv.totalAmount), supplierId: inv.supplierId });
  if (match.status === "failed") {
    throw new Error(`Three-way match failed: ${match.errors.join("; ")}`);
  }

  const [approved] = await db.update(supplierInvoicesTable)
    .set({ status: "approved", threeWayMatchStatus: "passed" })
    .where(eq(supplierInvoicesTable.id, invoiceId)).returning();

  // Publish approved event — Finance consumer will create journal entries
  await db.insert(purchaseEventsTable).values({
    eventType: "invoice.approved", aggregateType: "supplier_invoice", aggregateId: invoiceId,
    data: { invoiceNumber: inv.invoiceNumber, poId: inv.poId, totalAmount: parseFloat(inv.totalAmount), supplierId: inv.supplierId },
  });

  return approved;
}

export async function getInvoices(poId?: number, status?: string): Promise<any[]> {
  const conditions: any[] = [];
  if (poId) conditions.push(eq(supplierInvoicesTable.poId, poId));
  if (status) conditions.push(eq(supplierInvoicesTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(supplierInvoicesTable).where(where).orderBy(sql`created_at DESC`);
}
