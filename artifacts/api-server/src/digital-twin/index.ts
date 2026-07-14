export * from "./types";
export { DigitalTwinProvider } from "./DigitalTwinProvider";
export { setMirrorState, getMirrorState, createScenario, applyScenario, resetMirror } from "./BusinessMirror";
export { compareStates, findSignificantDrift } from "./TwinComparator";
export { detectDrift, getAlertHistory, clearAlerts } from "./DriftDetector";

let initialized = false;

export function initializeDigitalTwin(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[DT] Digital Twin initialized — Business Mirror + Comparator + Drift Detection ready`);
}
