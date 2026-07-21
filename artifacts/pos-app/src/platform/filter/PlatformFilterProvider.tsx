import React, { useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlatformFilterContext, type PlatformFilterContextValue } from "./PlatformFilterContext";
import { platformFilterReducer, type PlatformFilterAction } from "./PlatformFilterReducer";
import { type PlatformFilterState, type DatePreset, getDefaultPlatformFilter } from "./PlatformFilterTypes";

const STORAGE_KEY = "platform-filter";

function loadPersisted(): PlatformFilterState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function persist(state: PlatformFilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const INVALIDATION_KEYS = [
  ["finance"],
  ["dashboard"],
  ["cashflow"],
  ["timeline"],
  ["inventory"],
  ["analytics"],
  ["crm"],
  ["hr"],
  ["executive"],
  ["digitalTwin"],
  ["knowledge"],
] as const;

export function PlatformFilterProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const prevHashRef = useRef("");

  const [state, dispatch] = useReducer(platformFilterReducer, null, () => {
    return loadPersisted() || getDefaultPlatformFilter();
  });

  const stateHash = JSON.stringify(state);

  useEffect(() => {
    persist(state);
    const newHash = stateHash;
    if (prevHashRef.current !== "" && prevHashRef.current !== newHash) {
      for (const key of INVALIDATION_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }
    prevHashRef.current = newHash;
  }, [stateHash, queryClient]);

  useEffect(() => {
    try {
      const encoded = btoa(stateHash);
      const current = new URLSearchParams(window.location.search);
      current.set("pf", encoded);
      const newUrl = window.location.pathname + "?" + current.toString();
      window.history.replaceState(null, "", newUrl);
    } catch {}
  }, [stateHash]);

  const dispatchAction = useCallback(
    (action: PlatformFilterAction) => dispatch(action),
    []
  );

  const setBranches = useCallback((ids: number[]) => dispatch({ type: "SET_BRANCHES", branchIds: ids }), []);
  const setDatePreset = useCallback((preset: DatePreset) => dispatch({ type: "SET_DATE_PRESET", preset }), []);
  const setCustomDates = useCallback((s: string, e: string) => dispatch({ type: "SET_CUSTOM_DATES", startDate: s, endDate: e }), []);
  const setAccountingPeriod = useCallback((id: number | null) => dispatch({ type: "SET_ACCOUNTING_PERIOD", periodId: id }), []);
  const setCompanyId = useCallback((id: number | null) => dispatch({ type: "SET_COMPANY_ID", companyId: id }), []);
  const setBusinessUnitId = useCallback((id: number | null) => dispatch({ type: "SET_BUSINESS_UNIT_ID", businessUnitId: id }), []);
  const setCurrency = useCallback((currency: string) => dispatch({ type: "SET_CURRENCY", currency }), []);
  const setTimezone = useCallback((tz: string) => dispatch({ type: "SET_TIMEZONE", timezone: tz }), []);
  const refresh = useCallback(() => dispatch({ type: "REFRESH" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (state.companyId) p.companyId = String(state.companyId);
    if (state.businessUnitId) p.businessUnitId = String(state.businessUnitId);
    if (state.branchIds.length > 0) p.branchIds = state.branchIds.join(",");
    if (state.startDate) p.startDate = state.startDate;
    if (state.endDate) p.endDate = state.endDate;
    if (state.accountingPeriodId) p.accountingPeriodId = String(state.accountingPeriodId);
    return p;
  }, [state.companyId, state.businessUnitId, state.branchIds, state.startDate, state.endDate, state.accountingPeriodId]);

  const contextValue: PlatformFilterContextValue = useMemo(
    () => ({
      state,
      dispatch: dispatchAction,
      setBranches,
      setDatePreset,
      setCustomDates,
      setAccountingPeriod,
      setCompanyId,
      setBusinessUnitId,
      setCurrency,
      setTimezone,
      refresh,
      reset,
      queryParams,
    }),
    [state, dispatchAction, setBranches, setDatePreset, setCustomDates, setAccountingPeriod,
     setCompanyId, setBusinessUnitId, setCurrency, setTimezone, refresh, reset, queryParams]
  );

  return (
    <PlatformFilterContext.Provider value={contextValue}>
      {children}
    </PlatformFilterContext.Provider>
  );
}
