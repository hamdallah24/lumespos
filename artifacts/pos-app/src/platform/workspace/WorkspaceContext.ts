import { createContext } from "react";
import { type WorkspaceState, type DatePreset, type ExecutiveRole, type WorkspaceScenario } from "./WorkspaceTypes";
import type { WorkspaceAction } from "./WorkspaceReducer";

export interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  setCompany: (id: number | null) => void;
  setWorkspace: (id: string | null, name: string) => void;
  setExecutiveRuntime: (role: ExecutiveRole) => void;
  setBusinessUnit: (id: number | null) => void;
  setBranches: (ids: number[]) => void;
  setWarehouses: (ids: number[]) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDates: (start: string, end: string) => void;
  setAccountingPeriod: (id: number | null) => void;
  setScenario: (scenario: WorkspaceScenario) => void;
  setCurrency: (currency: string) => void;
  setTimezone: (timezone: string) => void;
  setLanguage: (language: string) => void;
  refresh: () => void;
  reset: () => void;
  queryParams: Record<string, string>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
