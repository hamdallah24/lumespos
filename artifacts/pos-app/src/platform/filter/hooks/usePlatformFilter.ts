import { useContext, useMemo } from "react";
import { PlatformFilterContext, type PlatformFilterContextValue } from "../PlatformFilterContext";

export function usePlatformFilter(): PlatformFilterContextValue {
  const ctx = useContext(PlatformFilterContext);
  if (!ctx) throw new Error("usePlatformFilter must be used within PlatformFilterProvider");
  return ctx;
}

export function useFilterBranchIds(): number[] {
  const { state } = usePlatformFilter();
  return state.branchIds;
}

export function useFilterSingleBranchId(): number | null {
  const { state } = usePlatformFilter();
  return state.branchIds.length === 1 ? state.branchIds[0] : null;
}

export function useFilterDates(): { startDate: string | null; endDate: string | null } {
  const { state } = usePlatformFilter();
  return useMemo(() => ({ startDate: state.startDate, endDate: state.endDate }), [state.startDate, state.endDate]);
}

export function useFilterAccountingPeriod(): number | null {
  const { state } = usePlatformFilter();
  return state.accountingPeriodId;
}

export function useFilterCompanyId(): number | null {
  const { state } = usePlatformFilter();
  return state.companyId;
}

export function useFilterQueryParams(): Record<string, string> {
  const { queryParams } = usePlatformFilter();
  return queryParams;
}

export function useFilterBranchParam(): string | undefined {
  const { state } = usePlatformFilter();
  return state.branchIds.length > 0 ? state.branchIds.join(",") : undefined;
}
