import { db, eventStoreTable } from "@workspace/db";

export interface InventoryEvent {
  movementType: string;
  branchId: number;
  warehouseId: number;
  itemType: string;
  itemId: number;
  quantity: number;
  totalCost: number;
  unitCost: number;
  referenceType?: string;
  referenceId?: number;
  stockCardId: number;
  description?: string;
}

export async function publishEvent(event: InventoryEvent): Promise<void> {
  await db.insert(eventStoreTable).values({
    eventType: `inventory.${event.movementType}`,
    eventVersion: 1,
    aggregateId: `${event.stockCardId}`,
    aggregateType: "stock_card",
    data: {
      branchId: event.branchId,
      warehouseId: event.warehouseId,
      itemType: event.itemType,
      itemId: event.itemId,
      quantity: event.quantity,
      totalCost: event.totalCost,
      unitCost: event.unitCost,
      referenceType: event.referenceType,
      referenceId: event.referenceId,
      stockCardId: event.stockCardId,
      description: event.description,
    } as any,
    metadata: {
      movementType: event.movementType,
      publishedAt: new Date().toISOString(),
    } as any,
  });
}
