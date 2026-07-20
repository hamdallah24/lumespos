import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from "react";

// ── Types ──

export type DatePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";
export type ComparisonMode = "none" | "prevPeriod" | "prevMonth" | "prevYear";

export interface FinanceFilterState {
  branchIds: number[];
  warehouseIds: number[];
  datePreset: DatePreset;
  startDate: string | null;
  endDate: string | null;
  comparisonMode: ComparisonMode;
  accountingPeriodId: number | null;
}

const STORAGE_KEY = "finance-filter";

function getDefaultState(): FinanceFilterState {
  const now = new Date();
  return {
    branchIds: [],
    warehouseIds: [],
    datePreset: "thisMonth",
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    comparisonMode: "none",
    accountingPeriodId: null,
  };
}

function loadPersisted(): FinanceFilterState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { }
  return null;
}

function persist(state: FinanceFilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { }
}

function computeDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "today": return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "last7": {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "last30": {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "thisMonth": {
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    case "lastMonth": {
      return {
        startDate: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        endDate: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }
    default: return { startDate: fmt(today), endDate: fmt(today) };
  }
}

// ── Actions ──

type Action =
  | { type: "SET_BRANCHES"; branchIds: number[] }
  | { type: "SET_WAREHOUSES"; warehouseIds: number[] }
  | { type: "SET_DATE_PRESET"; preset: DatePreset }
  | { type: "SET_CUSTOM_DATES"; startDate: string; endDate: string }
  | { type: "SET_COMPARISON"; mode: ComparisonMode }
  | { type: "SET_ACCOUNTING_PERIOD"; periodId: number | null }
  | { type: "RESET" }
  | { type: "LOAD"; state: FinanceFilterState };

function reducer(state: FinanceFilterState, action: Action): FinanceFilterState {
  switch (action.type) {
    case "SET_BRANCHES":
      return { ...state, branchIds: action.branchIds };
    case "SET_WAREHOUSES":
      return { ...state, warehouseIds: action.warehouseIds };
    case "SET_DATE_PRESET": {
      if (action.preset === "custom") return { ...state, datePreset: "custom" };
      const range = computeDateRange(action.preset);
      return { ...state, datePreset: action.preset, startDate: range.startDate, endDate: range.endDate };
    }
    case "SET_CUSTOM_DATES":
      return { ...state, datePreset: "custom", startDate: action.startDate, endDate: action.endDate };
    case "SET_COMPARISON":
      return { ...state, comparisonMode: action.mode };
    case "SET_ACCOUNTING_PERIOD":
      return { ...state, accountingPeriodId: action.periodId };
    case "RESET":
      return getDefaultState();
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}

// ── Context ──

interface FinanceFilterContextValue {
  state: FinanceFilterState;
  setBranches: (ids: number[]) => void;
  setWarehouses: (ids: number[]) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDates: (start: string, end: string) => void;
  setComparison: (mode: ComparisonMode) => void;
  setAccountingPeriod: (id: number | null) => void;
  reset: () => void;
  queryParams: Record<string, string>;
}

const FinanceFilterContext = createContext<FinanceFilterContextValue | null>(null);

export function FinanceFilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    // Try load from URL first, then localStorage, then default
    try {
      const params = new URLSearchParams(window.location.search);
      const urlState = params.get("ff");
      if (urlState) return JSON.parse(atob(urlState)) as FinanceFilterState;
    } catch { }
    return loadPersisted() || getDefaultState();
  });

  // Persist on change
  useEffect(() => {
    persist(state);
    // Sync to URL
    try {
      const encoded = btoa(JSON.stringify(state));
      const current = new URLSearchParams(window.location.search);
      current.set("ff", encoded);
      const newUrl = window.location.pathname + "?" + current.toString();
      window.history.replaceState(null, "", newUrl);
    } catch { }
  }, [state]);

  const setBranches = useCallback((ids: number[]) => dispatch({ type: "SET_BRANCHES", branchIds: ids }), []);
  const setWarehouses = useCallback((ids: number[]) => dispatch({ type: "SET_WAREHOUSES", warehouseIds: ids }), []);
  const setDatePreset = useCallback((preset: DatePreset) => dispatch({ type: "SET_DATE_PRESET", preset }), []);
  const setCustomDates = useCallback((s: string, e: string) => dispatch({ type: "SET_CUSTOM_DATES", startDate: s, endDate: e }), []);
  const setComparison = useCallback((mode: ComparisonMode) => dispatch({ type: "SET_COMPARISON", mode }), []);
  const setAccountingPeriod = useCallback((id: number | null) => dispatch({ type: "SET_ACCOUNTING_PERIOD", periodId: id }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (state.branchIds.length > 0) p.branchIds = state.branchIds.join(",");
    if (state.startDate) p.startDate = state.startDate;
    if (state.endDate) p.endDate = state.endDate;
    if (state.accountingPeriodId) p.accountingPeriodId = String(state.accountingPeriodId);
    return p;
  }, [state.branchIds, state.startDate, state.endDate, state.accountingPeriodId]);

  return (
    <FinanceFilterContext.Provider value={{
      state, setBranches, setWarehouses, setDatePreset, setCustomDates,
      setComparison, setAccountingPeriod, reset, queryParams,
    }}>
      {children}
    </FinanceFilterContext.Provider>
  );
}

export function useFinanceFilter() {
  const ctx = useContext(FinanceFilterContext);
  if (!ctx) throw new Error("useFinanceFilter must be used within FinanceFilterProvider");
  return ctx;
}

// Returns the first selected branchId from filter, or null if all branches
export function useFilteredBranchId(): number | null {
  const { state } = useFinanceFilter();
  return state.branchIds.length === 1 ? state.branchIds[0] : null;
}

export function useFilteredBranchIds(): number[] {
  const { state } = useFinanceFilter();
  return state.branchIds;
}

export function useFilterDates(): { startDate: string | null; endDate: string | null } {
  const { state } = useFinanceFilter();
  return { startDate: state.startDate, endDate: state.endDate };
}
