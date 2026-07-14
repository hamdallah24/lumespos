import type { BusinessState } from "./types";

let overrides: Partial<BusinessState> = {};

export function setBusinessStateOverrides(state: Partial<BusinessState>): void {
  overrides = state;
}

export function collectBusinessState(): BusinessState {
  return {
    cashAvailable: overrides.cashAvailable ?? 0,
    activeBranches: overrides.activeBranches ?? 1,
    activeEmployees: overrides.activeEmployees ?? 0,
    currentWorkload: overrides.currentWorkload ?? 0,
    operatingHours: overrides.operatingHours ?? 8,
  };
}
