import type { TwinBusinessState, TwinScenario, TwinAdjustment } from "./types";

let mirrorState: TwinBusinessState = {
  cashAvailable: 0,
  revenue: 0,
  expenses: 0,
  grossMargin: 0,
  stockCoverageDays: 0,
  activeBranches: 0,
  activeEmployees: 0,
  customerSatisfaction: 0,
  updatedAt: new Date().toISOString(),
};

export function setMirrorState(state: TwinBusinessState): void {
  mirrorState = { ...state, updatedAt: new Date().toISOString() };
}

export function updateMirrorField(field: keyof TwinBusinessState, value: number): void {
  mirrorState[field] = value;
  mirrorState.updatedAt = new Date().toISOString();
}

export function getMirrorState(): TwinBusinessState {
  return { ...mirrorState };
}

export function resetMirror(): void {
  mirrorState = {
    cashAvailable: 0,
    revenue: 0,
    expenses: 0,
    grossMargin: 0,
    stockCoverageDays: 0,
    activeBranches: 0,
    activeEmployees: 0,
    customerSatisfaction: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function createScenario(label: string, adjustments: TwinAdjustment[]): TwinScenario {
  const projected = { ...mirrorState };
  for (const adj of adjustments) {
    const current = projected[adj.field] as number;
    (projected[adj.field] as number) = Math.max(0, current + adj.delta);
  }
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    adjustments,
    projected,
  };
}

export function applyScenario(scenario: TwinScenario): void {
  mirrorState = { ...scenario.projected, updatedAt: new Date().toISOString() };
}
