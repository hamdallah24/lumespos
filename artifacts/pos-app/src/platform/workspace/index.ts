export { WorkspaceContext } from "./WorkspaceContext";
export type { WorkspaceContextValue } from "./WorkspaceContext";
export { WorkspaceProvider } from "./WorkspaceProvider";
export { workspaceReducer } from "./WorkspaceReducer";
export type { WorkspaceAction } from "./WorkspaceReducer";
export type {
  WorkspaceState, ExecutiveRole, WorkspaceScenario,
  DatePreset,
} from "./WorkspaceTypes";
export { getDefaultWorkspace } from "./WorkspaceTypes";
export { useWorkspace } from "./hooks/useWorkspace";
export {
  useCompanyId, useBranchIds, useSingleBranchId,
  useWarehouseIds, useWorkspaceDates, useAccountingPeriodId,
  useExecutiveRuntime, useWorkspaceScenario,
  useWorkspaceQueryParams, useRefreshVersion,
} from "./hooks/selectors";
export { default as WorkspaceBar } from "./components/WorkspaceBar";
export type { WorkspaceBarMode } from "./components/WorkspaceBar";
export { default as WorkspaceSwitcher } from "./components/WorkspaceSwitcher";

export const WORKSPACE_FILTER_KEYS = [
  "companyId", "businessUnitId", "branchIds",
  "warehouseIds", "startDate", "endDate",
  "accountingPeriodId",
] as const;
