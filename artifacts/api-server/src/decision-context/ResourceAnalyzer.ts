import type { ResourceState } from "./types";

let overrides: Partial<ResourceState> = {};

export function setResourceState(state: Partial<ResourceState>): void {
  overrides = state;
}

export function analyzeResources(): ResourceState {
  return {
    inventoryAvailability: overrides.inventoryAvailability ?? 1,
    productionCapacity: overrides.productionCapacity ?? 1,
    logisticsCapacity: overrides.logisticsCapacity ?? 1,
    availableBudget: overrides.availableBudget ?? 0,
  };
}
