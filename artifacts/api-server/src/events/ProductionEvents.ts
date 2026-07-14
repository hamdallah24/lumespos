import type { BaseEvent } from "../event-bus";

export interface IngredientConsumedData {
  branchId: number;
  semiFinishedId: number;
  componentType: "ingredient" | "semi_finished";
  componentId: number;
  quantity: number;
}

export interface BatchProducedData {
  branchId: number;
  semiFinishedId: number;
  semiFinishedName: string;
  producedWeight: number;
  totalCost: number;
  newHpp: number;
}

export interface BatchProducedLegacyData {
  branchId: number;
  semiFinishedId: number;
  producedWeight: number;
  totalCost: number;
  newHpp: number;
}

export type ProductionEvent =
  | { type: "ingredient.consumed"; data: IngredientConsumedData }
  | { type: "batch.produced"; data: BatchProducedData };

export function createIngredientConsumedEvent(
  data: IngredientConsumedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `ingredient-consumed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "ingredient.consumed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `semi-finished:${data.semiFinishedId}`,
    aggregateType: "production",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createBatchProducedEvent(
  data: BatchProducedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `batch-produced-${data.semiFinishedId}-${Date.now()}`,
    type: "batch.produced",
    version: 1,
    timestamp: new Date(),
    aggregateId: `semi-finished:${data.semiFinishedId}`,
    aggregateType: "production",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}
