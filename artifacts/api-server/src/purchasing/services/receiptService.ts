import { db, goodsReceiptsTable, goodsReceiptItemsTable, purchaseOrdersTable, purchaseOrderItemsTable, purchaseEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { createMovement } from "../../inventory/services/movementService";

export async function createGoodsReceipt(data: {
  poId: number; branchId: number; warehouseId: number; receivedDate: string;
  notes?: string; receivedBy?: number;
}): Promise<any> {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, data.poId));
  if (!po) throw new Error("PO not found");
  if (!["sent", "partial"].includes(po.status)) {
    throw new Error(`PO status ${po.status} does not allow receipt`);
  }

  const poItems = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, data.poId));

  // Validate all items have sufficient remaining qty
  for (const item of poItems) {
    const remaining = parseFloat(item.quantityOrdered) - parseFloat(item.quantityReceived);
    // We'll receive all remaining by default — this service receives the FULL remaining
    if (remaining <= 0) throw new Error(`Item ${item.itemType}#${item.itemId} already fully received`);
  }

  // Create goods receipt
  const grNum = `GR-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-4)}`;
  const [gr] = await db.insert(goodsReceiptsTable).values({
    grNumber: grNum, poId: data.poId, branchId: data.branchId,
    warehouseId: data.warehouseId, receivedDate: data.receivedDate,
    notes: data.notes, receivedBy: data.receivedBy,
  }).returning();

  let allCompleted = true;
  const receiptItems: any[] = [];

  for (const poItem of poItems) {
    const remaining = parseFloat(poItem.quantityOrdered) - parseFloat(poItem.quantityReceived);
    const receiveQty = Math.max(0, remaining);
    const unitCost = parseFloat(poItem.unitCost);
    const totalCost = Math.round(receiveQty * unitCost * 100) / 100;

    if (receiveQty <= 0) { allCompleted = false; continue; }

    // Insert receipt item
    const [grItem] = await db.insert(goodsReceiptItemsTable).values({
      receiptId: gr.id, poItemId: poItem.id,
      itemType: poItem.itemType, itemId: poItem.itemId,
      quantityReceived: String(receiveQty), unitCost: String(unitCost),
      totalCost: String(totalCost),
    }).returning();
    receiptItems.push(grItem);

    // Update PO item quantity_received
    const newReceived = parseFloat(poItem.quantityReceived) + receiveQty;
    await db.update(purchaseOrderItemsTable)
      .set({ quantityReceived: String(newReceived) })
      .where(eq(purchaseOrderItemsTable.id, poItem.id));

    // Call Inventory Movement Engine — Purchasing NEVER writes inventory tables directly
    try {
      await createMovement({
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        itemType: poItem.itemType,
        itemId: poItem.itemId,
        movementType: "supplier_receipt",
        quantity: receiveQty,
        unitCost: unitCost,
        referenceType: "goods_receipt",
        referenceId: gr.id,
        description: `GR ${grNum} for PO ${po.poNumber}`,
        createdBy: data.receivedBy,
      });
    } catch (mvErr: any) {
      // If inventory movement fails, we still created the GR — log but don't fail
      console.error(`Inventory movement failed for GR ${grNum} item ${poItem.itemType}#${poItem.itemId}:`, mvErr.message);
    }
  }

  // Update PO status based on receipt completeness
  const updatedPoItems = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, data.poId));
  const allFullyReceived = updatedPoItems.every(
    (i) => parseFloat(i.quantityReceived) >= parseFloat(i.quantityOrdered),
  );
  const newPoStatus = allFullyReceived ? "completed" : "partial";
  await db.update(purchaseOrdersTable).set({ status: newPoStatus }).where(eq(purchaseOrdersTable.id, data.poId));

  // Publish event
  await db.insert(purchaseEventsTable).values({
    eventType: "goods.received", aggregateType: "goods_receipt", aggregateId: gr.id,
    data: {
      grNumber: grNum, poId: data.poId, poNumber: po.poNumber,
      itemCount: receiptItems.length, status: newPoStatus,
      warehouseId: data.warehouseId,
    },
  });

  return { ...gr, items: receiptItems, poStatus: newPoStatus };
}

export async function getGoodsReceipts(poId?: number): Promise<any[]> {
  const conditions: any[] = [];
  if (poId) conditions.push(eq(goodsReceiptsTable.poId, poId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const grs = await db.select().from(goodsReceiptsTable).where(where).orderBy(sql`created_at DESC`);
  const result = [];
  for (const gr of grs) {
    const items = await db.select().from(goodsReceiptItemsTable).where(eq(goodsReceiptItemsTable.receiptId, gr.id));
    result.push({ ...gr, items });
  }
  return result;
}
