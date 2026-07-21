import { useMemo } from "react";
import BusinessCard from "./BusinessCard";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import { useWorkspace } from "@/platform/workspace";
import {
  fetchCashToday,
  fetchCashflow,
  fetchProfit,
  fetchMissions,
  formatIDR,
} from "@/lib/home/home-data";

export default function BusinessOverview() {
  const { state: filter } = useWorkspace();
  const branchIds = filter.branchIds.length > 0 ? filter.branchIds : undefined;

  const cashFetcher = useMemo(
    () => () => fetchCashToday(branchIds, filter.startDate, filter.endDate),
    [branchIds, filter.startDate, filter.endDate]
  );
  const cashflowFetcher = useMemo(
    () => () => fetchCashflow(branchIds, filter.startDate, filter.endDate),
    [branchIds, filter.startDate, filter.endDate]
  );
  const profitFetcher = useMemo(
    () => () => fetchProfit(branchIds, filter.startDate, filter.endDate),
    [branchIds, filter.startDate, filter.endDate]
  );

  const cash = useWidgetProvider(cashFetcher, [branchIds, filter.startDate, filter.endDate]);
  const cashflow = useWidgetProvider(cashflowFetcher, [branchIds, filter.startDate, filter.endDate]);
  const profit = useWidgetProvider(profitFetcher, [branchIds, filter.startDate, filter.endDate]);
  const missions = useWidgetProvider(fetchMissions, []);

  return (
    <div className="px-6 py-0">
      <div className="grid grid-cols-2 gap-4">
        <BusinessCard
          title="Cash Today"
          amount={cash.data ? formatIDR(cash.data.amount) : "—"}
          change={cash.data?.change ?? 0}
          loading={cash.loading}
          error={cash.error}
          onRetry={cash.refresh}
        />
        <BusinessCard
          title="Cashflow"
          amount={cashflow.data ? formatIDR(cashflow.data.amount) : "—"}
          change={cashflow.data?.change ?? 0}
          loading={cashflow.loading}
          error={cashflow.error}
          onRetry={cashflow.refresh}
        />
        <BusinessCard
          title="Profit"
          amount={profit.data ? formatIDR(profit.data.amount) : "—"}
          change={profit.data?.change ?? 0}
          loading={profit.loading}
          error={profit.error}
          onRetry={profit.refresh}
        />
        <BusinessCard
          title="Misi"
          amount={
            missions.data
              ? `${missions.data.active}/${missions.data.total}`
              : "—"
          }
          change={0}
          loading={missions.loading}
          error={missions.error}
          onRetry={missions.refresh}
        />
      </div>
    </div>
  );
}
