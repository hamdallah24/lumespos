export type ExecutiveRole = "ceo" | "cfo" | "coo" | "cto" | "cmo" | "chro" | "cko" | "caio";
export type WorkspaceScenario = "live" | "forecast" | "simulation" | "historical";
export type DatePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";

export interface WorkspaceState {
  companyId: number | null;
  workspaceId: string | null;
  workspaceName: string;
  executiveRuntime: ExecutiveRole;
  businessUnitId: number | null;
  branchIds: number[];
  warehouseIds: number[];
  accountingPeriodId: number | null;
  startDate: string | null;
  endDate: string | null;
  datePreset: DatePreset;
  currency: string;
  timezone: string;
  scenario: WorkspaceScenario;
  language: string;
  refreshVersion: number;
  lastUpdated: number;
}

export function getDefaultWorkspace(): WorkspaceState {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    companyId: null,
    workspaceId: null,
    workspaceName: "Default",
    executiveRuntime: "ceo",
    businessUnitId: null,
    branchIds: [],
    warehouseIds: [],
    accountingPeriodId: null,
    datePreset: "thisMonth",
    startDate: startOfMonth.toISOString().slice(0, 10),
    endDate: endOfMonth.toISOString().slice(0, 10),
    currency: "IDR",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    scenario: "live",
    language: "id",
    refreshVersion: 0,
    lastUpdated: Date.now(),
  };
}
