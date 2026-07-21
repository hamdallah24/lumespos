import { useMemo } from "react";
import { useWorkspace } from "./useWorkspace";
import type { ExecutiveRole, WorkspaceScenario } from "../WorkspaceTypes";

export function useCompanyId(): number | null {
  const { state } = useWorkspace();
  return state.companyId;
}

export function useBranchIds(): number[] {
  const { state } = useWorkspace();
  return state.branchIds;
}

export function useSingleBranchId(): number | null {
  const { state } = useWorkspace();
  return state.branchIds.length === 1 ? state.branchIds[0] : null;
}

export function useWarehouseIds(): number[] {
  const { state } = useWorkspace();
  return state.warehouseIds;
}

export function useWorkspaceDates(): { startDate: string | null; endDate: string | null } {
  const { state } = useWorkspace();
  return useMemo(() => ({ startDate: state.startDate, endDate: state.endDate }), [state.startDate, state.endDate]);
}

export function useAccountingPeriodId(): number | null {
  const { state } = useWorkspace();
  return state.accountingPeriodId;
}

export function useExecutiveRuntime(): ExecutiveRole {
  const { state } = useWorkspace();
  return state.executiveRuntime;
}

export function useWorkspaceScenario(): WorkspaceScenario {
  const { state } = useWorkspace();
  return state.scenario;
}

export function useWorkspaceQueryParams(): Record<string, string> {
  const { queryParams } = useWorkspace();
  return queryParams;
}

export function useRefreshVersion(): number {
  const { state } = useWorkspace();
  return state.refreshVersion;
}
