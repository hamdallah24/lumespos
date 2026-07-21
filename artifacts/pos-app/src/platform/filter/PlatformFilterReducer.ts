import { type PlatformFilterState, type DatePreset, getDefaultPlatformFilter } from "./PlatformFilterTypes";

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

export type PlatformFilterAction =
  | { type: "SET_COMPANY_ID"; companyId: number | null }
  | { type: "SET_BUSINESS_UNIT_ID"; businessUnitId: number | null }
  | { type: "SET_BRANCHES"; branchIds: number[] }
  | { type: "SET_DATE_PRESET"; preset: DatePreset }
  | { type: "SET_CUSTOM_DATES"; startDate: string; endDate: string }
  | { type: "SET_ACCOUNTING_PERIOD"; periodId: number | null }
  | { type: "SET_CURRENCY"; currency: string }
  | { type: "SET_TIMEZONE"; timezone: string }
  | { type: "REFRESH" }
  | { type: "RESET" }
  | { type: "LOAD"; state: PlatformFilterState };

export function platformFilterReducer(state: PlatformFilterState, action: PlatformFilterAction): PlatformFilterState {
  switch (action.type) {
    case "SET_COMPANY_ID":
      return { ...state, companyId: action.companyId };
    case "SET_BUSINESS_UNIT_ID":
      return { ...state, businessUnitId: action.businessUnitId };
    case "SET_BRANCHES":
      return { ...state, branchIds: action.branchIds, lastRefresh: Date.now() };
    case "SET_DATE_PRESET": {
      if (action.preset === "custom") return { ...state, datePreset: "custom", lastRefresh: Date.now() };
      const range = computeDateRange(action.preset);
      return { ...state, datePreset: action.preset, startDate: range.startDate, endDate: range.endDate, lastRefresh: Date.now() };
    }
    case "SET_CUSTOM_DATES":
      return { ...state, datePreset: "custom", startDate: action.startDate, endDate: action.endDate, lastRefresh: Date.now() };
    case "SET_ACCOUNTING_PERIOD":
      return { ...state, accountingPeriodId: action.periodId, lastRefresh: Date.now() };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency };
    case "SET_TIMEZONE":
      return { ...state, timezone: action.timezone };
    case "REFRESH":
      return { ...state, lastRefresh: Date.now() };
    case "RESET":
      return getDefaultPlatformFilter();
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}
