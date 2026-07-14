import type { BaseEvent } from "../event-bus";

export interface StockAdjustedData {
  branchId: number;
  itemType: "ingredient" | "semi_finished";
  itemId: number;
  delta: number;
  newStock: number;
  previousStock: number;
}

export interface PurchaseReceivedData {
  branchId: number;
  ingredientId: number;
  quantity: number;
  purchaseTotal: number;
  newAverageCost: number;
}

export interface StockCorrectedData {
  branchId: number;
  itemType: "ingredient" | "semi_finished";
  itemId: number;
  previousStock: number;
  correctedStock: number;
  delta: number;
  reason?: string;
}

export type InventoryEvent =
  | { type: "stock.adjusted"; data: StockAdjustedData }
  | { type: "purchase.received"; data: PurchaseReceivedData }
  | { type: "stock.corrected"; data: StockCorrectedData };

export function createStockAdjustedEvent(
  data: StockAdjustedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `stock-adjusted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "stock.adjusted",
    version: 1,
    timestamp: new Date(),
    aggregateId: `${data.itemType}:${data.itemId}`,
    aggregateType: "inventory",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createPurchaseReceivedEvent(
  data: PurchaseReceivedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `purchase-received-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "purchase.received",
    version: 1,
    timestamp: new Date(),
    aggregateId: `ingredient:${data.ingredientId}`,
    aggregateType: "inventory",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createStockCorrectedEvent(
  data: StockCorrectedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `stock-corrected-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "stock.corrected",
    version: 1,
    timestamp: new Date(),
    aggregateId: `${data.itemType}:${data.itemId}`,
    aggregateType: "inventory",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}
