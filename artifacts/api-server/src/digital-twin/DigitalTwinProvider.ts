import type { TwinBusinessState, TwinScenario, TwinAdjustment, TwinComparison, DriftAlert } from "./types";
import { setMirrorState, updateMirrorField, getMirrorState, createScenario, applyScenario, resetMirror } from "./BusinessMirror";
import { compareStates, findSignificantDrift } from "./TwinComparator";
import { detectDrift, getAlertHistory, clearAlerts } from "./DriftDetector";

export const DigitalTwinProvider = {
  sync(state: TwinBusinessState): void {
    setMirrorState(state);
  },

  update(field: keyof TwinBusinessState, value: number): void {
    updateMirrorField(field, value);
  },

  getState(): TwinBusinessState {
    return getMirrorState();
  },

  createScenario(label: string, adjustments: TwinAdjustment[]): TwinScenario {
    return createScenario(label, adjustments);
  },

  applyScenario(scenario: TwinScenario): void {
    applyScenario(scenario);
  },

  compareWith(real: TwinBusinessState): TwinComparison[] {
    return compareStates(real, getMirrorState());
  },

  findDrift(real: TwinBusinessState, thresholdPercent = 10): TwinComparison[] {
    return findSignificantDrift(compareStates(real, getMirrorState()), thresholdPercent);
  },

  detectDrift(real: TwinBusinessState): DriftAlert[] {
    return detectDrift(real, getMirrorState());
  },

  getAlertHistory(): DriftAlert[] {
    return getAlertHistory();
  },

  reset(): void {
    resetMirror();
    clearAlerts();
  },
};
