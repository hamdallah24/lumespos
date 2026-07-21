import type { WorkspaceState } from "./WorkspaceTypes";
import { getDefaultWorkspace } from "./WorkspaceTypes";

const STORAGE_KEY = "lumes-workspace";

export function persistWorkspace(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadWorkspace(): WorkspaceState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WorkspaceState;
      return { ...getDefaultWorkspace(), ...parsed };
    }
  } catch {}
  return getDefaultWorkspace();
}

export function serializeWorkspace(state: WorkspaceState): string {
  const p = new URLSearchParams();
  if (state.companyId) p.set("company", String(state.companyId));
  if (state.workspaceId) p.set("ws", state.workspaceId);
  if (state.executiveRuntime !== "ceo") p.set("runtime", state.executiveRuntime);
  if (state.branchIds.length > 0) p.set("branch", state.branchIds.join(","));
  if (state.accountingPeriodId) p.set("period", String(state.accountingPeriodId));
  if (state.scenario !== "live") p.set("scenario", state.scenario);
  if (state.datePreset !== "thisMonth") p.set("preset", state.datePreset);
  if (state.datePreset === "custom" && state.startDate && state.endDate) {
    p.set("from", state.startDate);
    p.set("to", state.endDate);
  }
  return p.toString();
}

export function deserializeWorkspace(search: string): Partial<WorkspaceState> {
  try {
    const p = new URLSearchParams(search);
    const partial: Partial<WorkspaceState> = {};
    const company = p.get("company");
    if (company) partial.companyId = Number(company);
    const ws = p.get("ws");
    if (ws) partial.workspaceId = ws;
    const runtime = p.get("runtime");
    if (runtime) partial.executiveRuntime = runtime as any;
    const branch = p.get("branch");
    if (branch) partial.branchIds = branch.split(",").map(Number).filter((n) => !isNaN(n));
    const period = p.get("period");
    if (period) partial.accountingPeriodId = Number(period);
    const scenario = p.get("scenario");
    if (scenario) partial.scenario = scenario as any;
    const preset = p.get("preset");
    if (preset) partial.datePreset = preset as any;
    const from = p.get("from");
    const to = p.get("to");
    if (from && to) {
      partial.startDate = from;
      partial.endDate = to;
      partial.datePreset = "custom";
    }
    return partial;
  } catch {
    return {};
  }
}
