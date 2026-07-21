import { db, purchaseOrdersTable, purchaseOrderItemsTable, purchaseEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { PurchaseOrder, PoItem, InsertPurchaseOrder, InsertPoItem } from "@workspace/db";

const PO_STATUS_FLOW: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["partial", "completed", "cancelled"],
  partial: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function createPurchaseOrder(data: {
  supplierId: number; branchId: number; orderDate: string;
  expectedDate?: string; notes?: string; shippingCost?: string; taxAmount?: string;
  items: Array<{ itemType: string; itemId: number; quantityOrdered: number; unitCost: number }>;
  createdBy?: number;
}): Promise<PurchaseOrder> {
  const poNum = `PO-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-4)}`;
  const totalItems = data.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
  const shipping = parseFloat(data.shippingCost || "0");
  const tax = parseFloat(data.taxAmount || "0");
  const total = Math.round((totalItems + shipping + tax) * 100) / 100;

  const [po] = await db.insert(purchaseOrdersTable).values({
    poNumber: poNum, supplierId: data.supplierId, branchId: data.branchId,
    status: "draft", orderDate: data.orderDate, expectedDate: data.expectedDate,
    shippingCost: String(shipping), taxAmount: String(tax), totalAmount: String(total),
    notes: data.notes, createdBy: data.createdBy,
  }).returning();

  for (const item of data.items) {
    const tc = Math.round(item.quantityOrdered * item.unitCost * 100) / 100;
    await db.insert(purchaseOrderItemsTable).values({
      poId: po.id, itemType: item.itemType, itemId: item.itemId,
      quantityOrdered: String(item.quantityOrdered), unitCost: String(item.unitCost),
      totalCost: String(tc),
    });
  }

  await db.insert(purchaseEventsTable).values({
    eventType: "po.created", aggregateType: "purchase_order", aggregateId: po.id,
    data: { poNumber: poNum, supplierId: data.supplierId, totalAmount: total, itemCount: data.items.length },
  });

  return po;
}

export async function transitionPoStatus(poId: number, newStatus: string, userId?: number): Promise<PurchaseOrder> {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
  if (!po) throw new Error("PO not found");
  const allowed = PO_STATUS_FLOW[po.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid PO transition: ${po.status} → ${newStatus}`);
  }
  const updateData: any = { status: newStatus };
  if (newStatus === "approved") { updateData.approvedBy = userId; updateData.approvedAt = new Date(); }
  const [updated] = await db.update(purchaseOrdersTable).set(updateData).where(eq(purchaseOrdersTable.id, poId)).returning();
  await db.insert(purchaseEventsTable).values({
    eventType: `po.${newStatus}`, aggregateType: "purchase_order", aggregateId: poId,
    data: { oldStatus: po.status, newStatus, approvedBy: userId },
  });
  return updated;
}

export async function getPurchaseOrders(branchId?: number, status?: string): Promise<any[]> {
  const conditions: any[] = [];
  if (branchId) conditions.push(eq(purchaseOrdersTable.branchId, branchId));
  if (status) conditions.push(eq(purchaseOrdersTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const pos = await db.select().from(purchaseOrdersTable).where(where).orderBy(sql`created_at DESC`);
  const result = [];
  for (const po of pos) {
    const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, po.id));
    result.push({ ...po, items });
  }
  return result;
}

export async function getPurchaseOrderById(id: number): Promise<any | undefined> {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!po) return undefined;
  const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, id));
  return { ...po, items };
}
