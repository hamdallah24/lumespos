export type DatePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";

export interface PlatformFilterState {
  companyId: number | null;
  businessUnitId: number | null;
  branchIds: number[];
  accountingPeriodId: number | null;
  startDate: string | null;
  endDate: string | null;
  datePreset: DatePreset;
  currency: string;
  timezone: string;
  lastRefresh: number;
}

export function getDefaultPlatformFilter(): PlatformFilterState {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    companyId: null,
    businessUnitId: null,
    branchIds: [],
    accountingPeriodId: null,
    datePreset: "thisMonth",
    startDate: startOfMonth.toISOString().slice(0, 10),
    endDate: endOfMonth.toISOString().slice(0, 10),
    currency: "IDR",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastRefresh: Date.now(),
  };
}
