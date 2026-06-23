import React, { useState, useMemo, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
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
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, Banknote, Users, Wallet, Receipt,
  Percent, FlaskConical, Building2, LayoutGrid,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const CalendarPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(value));
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const d = new Date(value);
  const selDay = d.getDate(), selMonth = d.getMonth(), selYear = d.getFullYear();
  const vmYear = viewMonth.getFullYear(), vmMonth = viewMonth.getMonth();
  const firstDay = new Date(vmYear, vmMonth, 1).getDay();
  const daysInMonth = new Date(vmYear, vmMonth + 1, 0).getDate();
  const todayStr = new Date().toDateString();

  const rows: number[][] = [];
  let row: number[] = [];
  for (let i = 0; i < firstDay; i++) row.push(0);
  for (let day = 1; day <= daysInMonth; day++) {
    row.push(day);
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length) rows.push(row);

  const openPopup = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  const select = (day: number) => {
    const nd = new Date(vmYear, vmMonth, day);
    onChange(nd.toISOString().split("T")[0]);
    setOpen(false);
  };

  const nav = (delta: number) => {
    const nd = new Date(vmYear, vmMonth + delta, 1);
    setViewMonth(nd);
  };

  const dayNames = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <button ref={btnRef} onClick={openPopup}
        className="relative flex-1 min-w-0 max-w-[120px] bg-accent/60 border border-border/40 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground text-left cursor-pointer hover:bg-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 truncate">
        {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popupRef}
          style={{ position: "fixed", top: popupPos.top, left: popupPos.left, zIndex: 9999 }}
          className="bg-card border border-border/60 rounded-2xl shadow-xl backdrop-blur-xl p-3 w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => nav(-1)}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm">‹</button>
            <span className="text-sm font-semibold">
              {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][vmMonth]} {vmYear}
            </span>
            <button onClick={() => nav(1)}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map(n => (
              <div key={n} className="text-[10px] text-muted-foreground font-medium text-center py-1">{n}</div>
            ))}
          </div>
          <div className="space-y-0.5">
            {rows.map((r, ri) => (
              <div key={ri} className="grid grid-cols-7">
                {r.map((day, di) => {
                  if (day === 0) return <div key={di} />;
                  const isSelected = day === selDay && vmMonth === selMonth && vmYear === selYear;
                  const isToday = new Date(vmYear, vmMonth, day).toDateString() === todayStr;
                  return (
                    <button key={di} onClick={() => select(day)}
                      className={`w-full aspect-square rounded-lg text-xs font-medium transition-all touch-target
                        ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : isToday ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"}`}>
                      {day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function DashboardPage() {
  const { branchId, currentBranch } = useBranch();
  const { data: branchesRaw } = useListBranches();
  const allBranches = Array.isArray(branchesRaw) ? branchesRaw as { id: number; name: string }[] : [];

  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const activeBranchId = selectedBranch === "all" ? undefined : Number(selectedBranch);
  const isAllBranches = selectedBranch === "all";
  const params = { branchId: activeBranchId };

  const today = new Date();

  const [period, setPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(today.toISOString().split("T")[0]);

  const startDate = period === "today" ? today.toISOString().split("T")[0]
    : period === "7d" ? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
    : period === "30d" ? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]
    : customStart;
  const endDate = period === "custom" ? customEnd : today.toISOString().split("T")[0];

  const dateParams = { ...params, startDate, endDate };

  const [stockIndex, setStockIndex] = useState(0);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(params);
  const { data: topProducts = [], isLoading: loadingTop } = useGetTopProducts({ limit: 5, branchId: activeBranchId, startDate, endDate });
  const { data: chartData = [], isLoading: loadingChart } = useGetSalesChart(dateParams as any);
  const { data: cashierPerf = [], isLoading: loadingCashier } = useGetCashierPerformance(dateParams as any);
  const { data: financial, isLoading: loadingFinancial } = useGetFinancialReport(dateParams as any);
  const { data: lowStock = [], isLoading: loadingLow } = useGetLowStock(params);

  const [soldItems, setSoldItems] = useState<any[]>([]);
  const [loadingSold, setLoadingSold] = useState(false);

  React.useEffect(() => {
    setLoadingSold(true);
    const params = new URLSearchParams();
    if (activeBranchId) params.set("branchId", String(activeBranchId));
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    fetch(`/api/dashboard/sold-items?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setSoldItems(Array.isArray(data) ? data : []); })
      .catch(() => setSoldItems([]))
      .finally(() => setLoadingSold(false));
  }, [activeBranchId, startDate, endDate]);

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
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-4 py-5 space-y-4">
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
              <SelectTrigger className="shrink-0 h-[34px] text-[13px] bg-slate-100 dark:bg-slate-800 border-0 rounded-full px-3">
                <SelectValue placeholder="Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {allBranches.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Segmented Control */}
          <div className="segmented-control">
            {[{k:"today",l:"Hr Ini"},{k:"7d",l:"7 Hari"},{k:"30d",l:"30 Hari"}].map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)} className={`seg-control-btn ${period === p.k ? "active" : ""}`}>
                {p.l}
              </button>
            ))}
          </div>

          {/* Date Picker Row */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex-1 min-w-0"><CalendarPicker label="Dari" value={customStart} onChange={(v) => { setCustomStart(v); setPeriod("custom"); }} /></div>
            <span className="text-slate-300 text-sm shrink-0">—</span>
            <div className="flex-1 min-w-0"><CalendarPicker label="Ke" value={customEnd} onChange={(v) => { setCustomEnd(v); setPeriod("custom"); }} /></div>
          </div>

          {/* KPI Cards — 2-col grid, no overflow */}
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            {loadingSummary ? (
              [1,2,3,4].map((i) => <div key={i} className="h-[120px] rounded-[24px] bg-slate-100 dark:bg-slate-800 animate-pulse" />)
            ) : summary ? (<>
              <div className="card-premium flex flex-col justify-between min-w-0" style={{height:150}}>
                <div>
                  <div className="kpi-icon-box mb-3"><Banknote /></div>
                  <p className="card-title-text">Penjualan Hari Ini</p>
                  <p className="metric-primary text-slate-800 dark:text-slate-100 mt-1 truncate">{formatRp(summary.todayRevenue)}</p>
                </div>
                {(summary.todayRevenueDiff ?? 0) !== 0 && (
                  <span className={`metric-secondary ${summary.todayRevenueDiff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {summary.todayRevenueDiff >= 0 ? "+" : ""}{summary.todayRevenueDiff.toFixed(1)}% vs kemarin
                  </span>
                )}
              </div>
              <div className="card-premium flex flex-col justify-between min-w-0" style={{height:150}}>
                <div>
                  <div className="kpi-icon-box mb-3" style={{background:"#FFF5F5"}}><Wallet /></div>
                  <p className="card-title-text">Pengeluaran Hari Ini</p>
                  <p className="metric-primary text-slate-800 dark:text-slate-100 mt-1">{formatRp(summary.todayExpenses)}</p>
                </div>
              </div>
              <div className="card-premium flex flex-col justify-between min-w-0" style={{height:150}}>
                <div>
                  <div className="kpi-icon-box mb-3" style={{background:"#F0FDF4"}}><ShoppingCart /></div>
                  <p className="card-title-text">Transaksi</p>
                  <p className="metric-primary text-slate-800 dark:text-slate-100 mt-1">{summary.todayOrders}</p>
                </div>
              </div>
              <div className="card-premium flex flex-col justify-between min-w-0" style={{height:150}}>
                <div>
                  <div className="kpi-icon-box mb-3" style={{background:"#EFF6FF"}}><Package /></div>
                  <p className="card-title-text">Produk Aktif</p>
                  <p className="metric-primary text-slate-800 dark:text-slate-100 mt-1">{summary.totalProducts}</p>
                </div>
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
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChart} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "#2563EB", strokeDasharray: "4 4", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={4} fill="url(#chartGrad)" dot={false} activeDot={{ r: 5, fill: "#2563EB", stroke: "#fff", strokeWidth: 3 }} />
                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} strokeDasharray="4" fill="url(#expenseGrad)" dot={false} activeDot={{ r: 5, fill: "#EF4444", stroke: "#fff", strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Alert Stok Menipis */}
          {!loadingLow && lowStock.length > 0 && (
            <div className="alert-card">
              <AlertTriangle className="alert-icon" />
              <span className="text-sm font-semibold text-red-600 flex-1">Stok Menipis</span>
              <span className="text-xs font-medium text-red-400">{lowStock.length} item</span>
              <ChevronRight className="w-4 h-4 text-red-300" />
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

          {/* Aktivitas */}
          {soldItems.length > 0 && (
            <div className="chart-card">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Aktivitas Penjualan</h2>
              <div className="space-y-2">
                {soldItems.slice(0,10).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.productName}</p>
                      <p className="text-xs text-slate-400">{item.variantName ?? "Reguler"} · {item.totalSold} terjual</p>
                    </div>
                    <span className="text-sm font-semibold text-[#2563EB] ml-3">{formatRp(item.totalRevenue)}</span>
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
