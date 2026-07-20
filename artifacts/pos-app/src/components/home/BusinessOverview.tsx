import BusinessCard from "./BusinessCard";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import {
  fetchCashToday,
  fetchCashflow,
  fetchProfit,
  fetchMissions,
  formatIDR,
} from "@/lib/home/home-data";

export default function BusinessOverview() {
  const cash = useWidgetProvider(fetchCashToday, []);
  const cashflow = useWidgetProvider(fetchCashflow, []);
  const profit = useWidgetProvider(fetchProfit, []);
  const missions = useWidgetProvider(fetchMissions, []);

  return (
    <div className="px-6">
      <div className="grid grid-cols-2 gap-3">
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
