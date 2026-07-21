import { createContext } from "react";
import { type PlatformFilterState, type DatePreset } from "./PlatformFilterTypes";
import type { PlatformFilterAction } from "./PlatformFilterReducer";

export interface PlatformFilterContextValue {
  state: PlatformFilterState;
  dispatch: React.Dispatch<PlatformFilterAction>;
  setBranches: (ids: number[]) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDates: (start: string, end: string) => void;
  setAccountingPeriod: (id: number | null) => void;
  setCompanyId: (id: number | null) => void;
  setBusinessUnitId: (id: number | null) => void;
  setCurrency: (currency: string) => void;
  setTimezone: (timezone: string) => void;
  refresh: () => void;
  reset: () => void;
  queryParams: Record<string, string>;
}

export const PlatformFilterContext = createContext<PlatformFilterContextValue | null>(null);
