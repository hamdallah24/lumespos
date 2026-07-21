import { type WorkspaceState, type DatePreset, type ExecutiveRole, type WorkspaceScenario, getDefaultWorkspace } from "./WorkspaceTypes";

function computeDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "today":
      return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "thisMonth":
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "lastMonth":
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return { startDate: fmt(today), endDate: fmt(today) };
  }
}

export type WorkspaceAction =
  | { type: "SET_COMPANY"; companyId: number | null }
  | { type: "SET_WORKSPACE"; workspaceId: string | null; workspaceName: string }
  | { type: "SET_EXECUTIVE_RUNTIME"; role: ExecutiveRole }
  | { type: "SET_BUSINESS_UNIT"; businessUnitId: number | null }
  | { type: "SET_BRANCHES"; branchIds: number[] }
  | { type: "SET_WAREHOUSES"; warehouseIds: number[] }
  | { type: "SET_DATE_PRESET"; preset: DatePreset }
  | { type: "SET_CUSTOM_DATES"; startDate: string; endDate: string }
  | { type: "SET_ACCOUNTING_PERIOD"; periodId: number | null }
  | { type: "SET_SCENARIO"; scenario: WorkspaceScenario }
  | { type: "SET_CURRENCY"; currency: string }
  | { type: "SET_TIMEZONE"; timezone: string }
  | { type: "SET_LANGUAGE"; language: string }
  | { type: "REFRESH" }
  | { type: "RESET" }
  | { type: "LOAD"; state: WorkspaceState };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  const now = Date.now();
  switch (action.type) {
    case "SET_COMPANY":
      return { ...state, companyId: action.companyId, lastUpdated: now };
    case "SET_WORKSPACE":
      return { ...state, workspaceId: action.workspaceId, workspaceName: action.workspaceName, lastUpdated: now };
    case "SET_EXECUTIVE_RUNTIME":
      return { ...state, executiveRuntime: action.role, lastUpdated: now };
    case "SET_BUSINESS_UNIT":
      return { ...state, businessUnitId: action.businessUnitId, lastUpdated: now };
    case "SET_BRANCHES":
      return { ...state, branchIds: action.branchIds, lastUpdated: now };
    case "SET_WAREHOUSES":
      return { ...state, warehouseIds: action.warehouseIds, lastUpdated: now };
    case "SET_DATE_PRESET": {
      if (action.preset === "custom") return { ...state, datePreset: "custom", lastUpdated: now };
      const range = computeDateRange(action.preset);
      return { ...state, datePreset: action.preset, startDate: range.startDate, endDate: range.endDate, lastUpdated: now };
    }
    case "SET_CUSTOM_DATES":
      return { ...state, datePreset: "custom", startDate: action.startDate, endDate: action.endDate, lastUpdated: now };
    case "SET_ACCOUNTING_PERIOD":
      return { ...state, accountingPeriodId: action.periodId, lastUpdated: now };
    case "SET_SCENARIO":
      return { ...state, scenario: action.scenario, lastUpdated: now };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency, lastUpdated: now };
    case "SET_TIMEZONE":
      return { ...state, timezone: action.timezone, lastUpdated: now };
    case "SET_LANGUAGE":
      return { ...state, language: action.language, lastUpdated: now };
    case "REFRESH":
      return { ...state, refreshVersion: state.refreshVersion + 1, lastUpdated: now };
    case "RESET":
      return { ...getDefaultWorkspace(), lastUpdated: now };
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}
