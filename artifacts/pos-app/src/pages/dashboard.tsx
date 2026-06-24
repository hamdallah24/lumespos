import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  useGetDashboardSummary,
  useGetTopProducts,
  useGetSalesChart,
  useGetCashierPerformance,
  useGetFinancialReport,
  useGetLowStock,
  useListBranches,
} from "@workspace/api-client-react";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, Banknote, Users, Wallet, Receipt,
  Percent, FlaskConical, Building2, LayoutGrid,
  ArrowUpRight, ArrowDownRight, ChevronRight, CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DateRange } from "react-day-picker";

function StatCard({ title, value, diff, icon: Icon, format = "number" }: {
  title: string; value: number; diff?: number;
  icon: React.ElementType; format?: "currency" | "number";
}) {
  const isPositive = (diff ?? 0) >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-lg font-bold mt-1 tracking-tight truncate">
            {format === "currency" ? formatRp(value) : value.toLocaleString("id-ID")}
          </p>
          {diff !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(diff).toFixed(1)}% vs kemarin</span>
            </div>
          )}
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ml-2 sm:ml-3">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function DateRangeFilter({ dateRange, onDateRangeChange }: { dateRange: DateRange | undefined; onDateRangeChange: (r: DateRange | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const presets = [
    { k: "today", l: "Hr Ini", get: () => ({ from: new Date(), to: new Date() }) },
    { k: "7d", l: "7 Hari", get: () => ({ from: new Date(Date.now() - 6 * 86400000), to: new Date() }) },
    { k: "30d", l: "30 Hari", get: () => ({ from: new Date(Date.now() - 29 * 86400000), to: new Date() }) },
  ];

  const isPresetMatch = (p: typeof presets[0]) => {
    const v = p.get();
    return dateRange?.from?.toDateString() === v.from.toDateString() && dateRange?.to?.toDateString() === v.to.toDateString();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" ref={ref}>
      {presets.map(p => (
        <button key={p.k} onClick={() => { onDateRangeChange(p.get()); setOpen(false); }}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            isPresetMatch(p)
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}>
          {p.l}
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            !presets.some(isPresetMatch) && open
              ? "bg-primary text-primary-foreground shadow-sm"
              : !presets.some(isPresetMatch)
              ? "bg-primary/10 text-primary"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}>
          <CalendarDays className="w-3.5 h-3.5" />
          {dateRange?.from && dateRange?.to
            ? `${dateRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — ${dateRange.to.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
            : "Pilih Tanggal"}
        </button>
        {open && (
          <div className="absolute top-full mt-2 left-0 z-50 bg-card border border-border/60 rounded-2xl shadow-xl backdrop-blur-xl p-3">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(r) => { onDateRangeChange(r); if (r?.from && r?.to && r.to > r.from) setOpen(false); }}
              numberOfMonths={1}
              min={5}
            />
            <div className="text-muted-foreground text-center text-xs mt-1">
              Minimum 5 hari
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { branchId, currentBranch } = useBranch();
  const { data: branchesRaw } = useListBranches();
  const allBranches = Array.isArray(branchesRaw) ? branchesRaw as { id: number; name: string }[] : [];

  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const activeBranchId = selectedBranch === "all" ? undefined : Number(selectedBranch);
  const isAllBranches = selectedBranch === "all";
  const params = { branchId: activeBranchId };

  const today = useMemo(() => new Date(), []);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 29 * 86400000),
    to: today,
  });

  const startDate = dateRange?.from ? dateRange.from.toISOString().split("T")[0] : new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0];
  const endDate = dateRange?.to ? dateRange.to.toISOString().split("T")[0] : today.toISOString().split("T")[0];

  const dateParams = { ...params, startDate, endDate };

  const [stockIndex, setStockIndex] = useState(0);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(params);
  const { data: topProducts = [], isLoading: loadingTop } = useGetTopProducts({ limit: 5, branchId: activeBranchId, startDate, endDate });
  const { data: chartData = [], isLoading: loadingChart } = useGetSalesChart(dateParams as any);
  const { data: cashierPerf = [], isLoading: loadingCashier } = useGetCashierPerformance(dateParams as any);
  const { data: financial, isLoading: loadingFinancial } = useGetFinancialReport(dateParams as any);
  const { data: lowStock = [], isLoading: loadingLow } = useGetLowStock(params);

  useEffect(() => {
    if (lowStock.length <= 1) return;
    const interval = setInterval(() => {
      setStockIndex((prev) => (prev + 1) % lowStock.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [lowStock.length]);

  const isHourly = chartData.some((d: any) => d.date?.includes("T"));
  const formattedChart = chartData.map((d: any) => ({
    ...d,
    dateLabel: isHourly
      ? d.date.split("T")[1]?.slice(0, 5) ?? d.date
      : new Date(d.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
  }));

  const trendUp = useMemo(() => {
    if (formattedChart.length < 2) return true;
    const vals = formattedChart.map(d => d.revenue ?? 0);
    return vals[vals.length - 1] >= vals[0];
  }, [formattedChart]);

  const trendColor = trendUp ? "#1565FF" : "#EF4444";

  function PremiumChartTooltip({ active, payload, label }: any) {
    if (active && payload?.length) {
      const val = payload[0].value;
      const prevVal = payload[0]?.payload?.prevValue ?? val;
      const isUp = val >= prevVal;
      return (
        <div className="bg-card border border-border rounded-2xl shadow-xl p-3 min-w-[140px]">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: isUp ? "#1565FF" : "#EF4444" }}>
            {formatRp(val)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {isUp ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
            <span className={`text-xs font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
              {isUp ? "Naik" : "Turun"}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 overflow-x-hidden min-h-0 overflow-fallback">
        <div className="px-4 py-5 space-y-3 min-w-0">
          {/* Headline + branch selector */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="heading-dash text-slate-800 dark:text-slate-200">Dashboard</h1>
              <p className="text-[13px] text-slate-500 mt-1">
                {new Date(startDate).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})}
                {startDate !== endDate ? ` — ${new Date(endDate).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})}` : ""}
              </p>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="shrink-0 h-[30px] text-[12px] bg-slate-100 dark:bg-slate-800 border-0 rounded-full px-2.5 w-auto">
                <SelectValue placeholder="Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {allBranches.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

          {/* KPI Cards — 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            {loadingSummary ? (
              [1,2,3,4].map((i) => <div key={i} className="h-[140px] rounded-[24px] bg-slate-100 dark:bg-slate-800 animate-pulse" />)
            ) : summary ? (<>
              <div className="card-premium flex flex-col min-w-0">
                <div className="kpi-icon-box mb-1.5"><Banknote /></div>
                <p className="card-title-text">Penjualan Hari Ini</p>
                <p className="metric-primary text-slate-800 dark:text-slate-100">{formatRp(summary.todayRevenue)}</p>
                <div className="mt-auto">{(summary.todayRevenueDiff ?? 0) !== 0 && (<span className={`metric-secondary ${summary.todayRevenueDiff >= 0 ? "text-emerald-500" : "text-red-500"}`}>{summary.todayRevenueDiff >= 0 ? "+" : ""}{summary.todayRevenueDiff.toFixed(1)}% vs kemarin</span>)}</div>
              </div>
              <div className="card-premium flex flex-col min-w-0">
                <div className="kpi-icon-box mb-1.5" style={{background:"#FFF5F5"}}><Wallet /></div>
                <p className="card-title-text">Pengeluaran Hari Ini</p>
                <p className="metric-primary text-slate-800 dark:text-slate-100">{formatRp(summary.todayExpenses)}</p>
                <div className="mt-auto"><span className="metric-secondary text-slate-400">—</span></div>
              </div>
              <div className="card-premium flex flex-col min-w-0">
                <div className="kpi-icon-box mb-1.5" style={{background:"#F0FDF4"}}><ShoppingCart /></div>
                <p className="card-title-text">Transaksi</p>
                <p className="metric-primary text-slate-800 dark:text-slate-100">{summary.todayOrders}</p>
                <div className="mt-auto"><span className="metric-secondary text-slate-400">—</span></div>
              </div>
              <div className="card-premium flex flex-col min-w-0">
                <div className="kpi-icon-box mb-1.5" style={{background:"#EFF6FF"}}><Package /></div>
                <p className="card-title-text">Produk Aktif</p>
                <p className="metric-primary text-slate-800 dark:text-slate-100">{summary.totalProducts}</p>
                <div className="mt-auto"><span className="metric-secondary text-slate-400">—</span></div>
              </div>
            </>) : null}
          </div>

          {/* Analytics Chart */}
          <div className="chart-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Grafik Penjualan</h2>
                <p className="caption mt-0.5">
                  {new Date(startDate).toLocaleDateString("id-ID")} — {new Date(endDate).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {trendUp ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                <span className={`text-[13px] font-semibold ${trendUp ? "text-emerald-500" : "text-red-500"}`}>
                  {trendUp ? "Meningkat" : "Menurun"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:"#2563EB"}} />
                <span className="text-xs text-slate-500">Pendapatan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:"#EF4444"}} />
                <span className="text-xs text-slate-500">Pengeluaran</span>
              </div>
            </div>
            {loadingChart ? (
              <div className="h-[200px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : formattedChart.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">Belum ada data penjualan</div>
            ) : (
              <div className="h-[180px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={35} />
                    <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "#2563EB", strokeDasharray: "4 4", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={4} fill="url(#chartGrad)" dot={false} activeDot={{ r: 5, fill: "#2563EB", stroke: "#fff", strokeWidth: 3 }} />
                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={4} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 5, fill: "#EF4444", stroke: "#fff", strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Alert Stok Menipis — slide-up animation */}
          {!loadingLow && lowStock.length > 0 && (
            <div className="alert-card relative overflow-hidden">
              <AlertTriangle className="alert-icon" />
              <span className="text-xs font-semibold text-red-600 shrink-0">Stok Menipis</span>
              <div className="flex-1 min-w-0 relative h-full flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={stockIndex}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center"
                  >
                    <span className="text-xs font-medium text-red-500 truncate">
                      {lowStock[stockIndex].name}
                    </span>
                    <span className="text-xs font-semibold text-red-500 ml-1.5 shrink-0">
                      {lowStock[stockIndex].currentStock}
                    </span>
                    <span className="text-xs text-red-400 ml-0.5 shrink-0">{lowStock[stockIndex].unit}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
              <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
            </div>
          )}

          {/* Best Seller */}
          {!loadingTop && topProducts.length > 0 && (
            <div className="chart-card">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Produk Terlaris</h2>
              <div className="space-y-4">
                {topProducts.map((p: any, idx: number) => {
                  const maxSold = topProducts[0]?.totalSold ?? 1;
                  const pct = (p.totalSold / maxSold) * 100;
                  return (
                    <div key={p.productId} className="flex items-center gap-3">
                      <span className={`w-5 text-center text-sm font-bold ${idx === 0 ? "text-[#2563EB]" : "text-slate-400"}`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[16px] font-semibold text-slate-800 dark:text-slate-200 truncate">{p.productName}</span>
                          <span className="text-[14px] font-medium text-slate-400 ml-2 shrink-0">{p.totalSold} terjual</span>
                        </div>
                        <div className="progress-native">
                          <div className="progress-native-fill" style={{width:`${pct}%`}} />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#2563EB] shrink-0">{formatRp(p.totalRevenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Section */}
          {financial && (
            <div className="chart-card">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Keuangan</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:"Pendapatan",v:financial.grossRevenue,c:""},
                  {l:"HPP",v:financial.totalCogs,c:""},
                  {l:"Laba Kotor",v:financial.grossProfit,c:"text-emerald-600"},
                  {l:"Margin Kotor",v:`${financial.grossMarginPct.toFixed(1)}%`,c:""},
                  {l:"Pengeluaran",v:financial.totalExpenses,c:"text-red-500"},
                  {l:"Laba Bersih",v:financial.netProfit,c:"text-emerald-600"},
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                    <p className="card-title-text mb-1">{item.l}</p>
                    <p className={`text-base font-bold ${item.c || "text-slate-800 dark:text-slate-200"}`}>
                      {typeof item.v === "number" ? formatRp(item.v) : item.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
