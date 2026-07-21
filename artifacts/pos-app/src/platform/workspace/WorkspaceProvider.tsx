import React, { useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceContext, type WorkspaceContextValue } from "./WorkspaceContext";
import { workspaceReducer } from "./WorkspaceReducer";
import { type WorkspaceState, type DatePreset, type ExecutiveRole, type WorkspaceScenario, getDefaultWorkspace } from "./WorkspaceTypes";
import { persistWorkspace, loadWorkspace, serializeWorkspace, deserializeWorkspace } from "./WorkspaceStorage";
import { WORKSPACE_INVALIDATION_KEYS } from "./WorkspaceQuery";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const prevHashRef = useRef("");

  const [state, dispatch] = useReducer(workspaceReducer, null, () => {
    const merged = loadWorkspace();
    const urlPartial = deserializeWorkspace(window.location.search);
    return { ...merged, ...urlPartial };
  });

  const stateHash = JSON.stringify(state);

  useEffect(() => {
    persistWorkspace(state);
    const newHash = stateHash;
    if (prevHashRef.current !== "" && prevHashRef.current !== newHash) {
      for (const key of WORKSPACE_INVALIDATION_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }
    prevHashRef.current = newHash;
  }, [stateHash, queryClient]);

  useEffect(() => {
    try {
      const qs = serializeWorkspace(state);
      const prefix = qs ? "?" + qs : "";
      const newUrl = window.location.pathname + prefix;
      window.history.replaceState(null, "", newUrl);
    } catch {}
  }, [stateHash]);

  const dispatchAction = useCallback((action: any) => dispatch(action), []);

  const setCompany = useCallback((id: number | null) => dispatch({ type: "SET_COMPANY", companyId: id }), []);
  const setWorkspace = useCallback((id: string | null, name: string) => dispatch({ type: "SET_WORKSPACE", workspaceId: id, workspaceName: name }), []);
  const setExecutiveRuntime = useCallback((role: ExecutiveRole) => dispatch({ type: "SET_EXECUTIVE_RUNTIME", role }), []);
  const setBusinessUnit = useCallback((id: number | null) => dispatch({ type: "SET_BUSINESS_UNIT", businessUnitId: id }), []);
  const setBranches = useCallback((ids: number[]) => dispatch({ type: "SET_BRANCHES", branchIds: ids }), []);
  const setWarehouses = useCallback((ids: number[]) => dispatch({ type: "SET_WAREHOUSES", warehouseIds: ids }), []);
  const setDatePreset = useCallback((preset: DatePreset) => dispatch({ type: "SET_DATE_PRESET", preset }), []);
  const setCustomDates = useCallback((s: string, e: string) => dispatch({ type: "SET_CUSTOM_DATES", startDate: s, endDate: e }), []);
  const setAccountingPeriod = useCallback((id: number | null) => dispatch({ type: "SET_ACCOUNTING_PERIOD", periodId: id }), []);
  const setScenario = useCallback((scenario: WorkspaceScenario) => dispatch({ type: "SET_SCENARIO", scenario }), []);
  const setCurrency = useCallback((currency: string) => dispatch({ type: "SET_CURRENCY", currency }), []);
  const setTimezone = useCallback((tz: string) => dispatch({ type: "SET_TIMEZONE", timezone: tz }), []);
  const setLanguage = useCallback((lang: string) => dispatch({ type: "SET_LANGUAGE", language: lang }), []);
  const refresh = useCallback(() => dispatch({ type: "REFRESH" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (state.companyId) p.companyId = String(state.companyId);
    if (state.businessUnitId) p.businessUnitId = String(state.businessUnitId);
    if (state.branchIds.length > 0) p.branchIds = state.branchIds.join(",");
    if (state.warehouseIds.length > 0) p.warehouseIds = state.warehouseIds.join(",");
    if (state.startDate) p.startDate = state.startDate;
    if (state.endDate) p.endDate = state.endDate;
    if (state.accountingPeriodId) p.accountingPeriodId = String(state.accountingPeriodId);
    return p;
  }, [state.companyId, state.businessUnitId, state.branchIds, state.warehouseIds, state.startDate, state.endDate, state.accountingPeriodId]);

  const contextValue: WorkspaceContextValue = useMemo(
    () => ({
      state,
      dispatch: dispatchAction,
      setCompany, setWorkspace, setExecutiveRuntime, setBusinessUnit,
      setBranches, setWarehouses, setDatePreset, setCustomDates,
      setAccountingPeriod, setScenario, setCurrency, setTimezone, setLanguage,
      refresh, reset, queryParams,
    }),
    [state, dispatchAction, setCompany, setWorkspace, setExecutiveRuntime, setBusinessUnit,
     setBranches, setWarehouses, setDatePreset, setCustomDates, setAccountingPeriod,
     setScenario, setCurrency, setTimezone, setLanguage, refresh, reset, queryParams]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}
