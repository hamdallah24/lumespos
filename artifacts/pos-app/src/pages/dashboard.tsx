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
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StatCard({ title, value, diff, icon: Icon, format = "number" }: {
  title: string; value: number; diff?: number;
  icon: React.ElementType; format?: "currency" | "number";
}) {
  const isPositive = (diff ?? 0) >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-xl font-bold mt-1 tracking-tight truncate">
            {format === "currency" ? formatRp(value) : value.toLocaleString("id-ID")}
          </p>
          {diff !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(diff).toFixed(1)}% vs kemarin</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ml-3">
          <Icon className="w-5 h-5" />
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
        className="relative w-[120px] bg-accent/60 border border-border/40 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground text-left cursor-pointer hover:bg-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
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
      <div className="h-14 lg:h-16 border-b border-[#1565FF]/10 px-4 lg:px-6 flex items-center gap-2 bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background backdrop-blur-xl shrink-0 sticky top-0 z-20 rounded-2xl mx-3 mt-3">
        <h1 className="font-bold text-lg tracking-tight shrink-0">Dashboard</h1>
        <div className="flex items-center gap-2 ml-auto overflow-x-auto scrollbar-none">
          {/* Quick period */}
          <div className="flex gap-0.5 bg-accent/50 rounded-xl p-0.5 border border-border/50 shrink-0">
            {[{k:"today",l:"Hr Ini"},{k:"7d",l:"7 Hari"},{k:"30d",l:"30 Hari"}].map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap touch-target transition-all ${period === p.k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p.l}
              </button>
            ))}
          </div>
          {/* Custom date range */}
          <div className="relative">
            <CalendarPicker label="Dari" value={customStart} onChange={(v) => { setCustomStart(v); setPeriod("custom"); }} />
          </div>
          <span className="text-muted-foreground/30 text-[10px]">—</span>
          <div className="relative">
            <CalendarPicker label="Ke" value={customEnd} onChange={(v) => { setCustomEnd(v); setPeriod("custom"); }} />
          </div>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[120px] lg:w-[150px] h-7 text-[11px] bg-accent border-0 rounded-lg">
              <SelectValue placeholder="Pilih Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center">
                  <LayoutGrid className="w-3 h-3 mr-2" />
                  Semua Cabang {allBranches.length > 0 && `(${allBranches.length})`}
                </div>
              </SelectItem>
              {allBranches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  <div className="flex items-center">
                    <Building2 className="w-3 h-3 mr-2" />
                    {b.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 space-y-4">
          {/* Grafik Penjualan — Glassmorphism top */}
          <div className="relative rounded-2xl overflow-hidden border border-[#1565FF]/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1565FF]/[0.12] via-[#1565FF]/[0.03] to-white/90 backdrop-blur-xl" />
            <div className="relative p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Grafik Penjualan</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(startDate).toLocaleDateString("id-ID")} — {new Date(endDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
              {loadingChart ? (
                <div className="h-48 lg:h-56 rounded-xl bg-white/40 animate-pulse" />
              ) : formattedChart.length === 0 ? (
                <div className="h-48 lg:h-56 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Belum ada data penjualan</p>
                </div>
              ) : (
                <div className="h-48 lg:h-56">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#1565FF" }} />
                      <span className="text-xs font-medium text-foreground/80">Pendapatan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#EF4444" }} />
                      <span className="text-xs font-medium text-foreground/80">Pengeluaran</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      {trendUp ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${trendUp ? "text-green-500" : "text-red-500"}`}>
                        {trendUp ? "Meningkat" : "Menurun"}
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1565FF" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#1565FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,255,0.08)" vertical={false} />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                      <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "#1565FF", strokeDasharray: "4 4", strokeWidth: 1 }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Pendapatan"
                        stroke="#1565FF"
                        strokeWidth={2.5}
                        fill="url(#chartGrad)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                        dot={{ r: 3, fill: "#1565FF", stroke: "white", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#1565FF", stroke: "white", strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Pengeluaran"
                        stroke="#EF4444"
                        strokeWidth={2}
                        fill="url(#expenseGrad)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                        dot={{ r: 2, fill: "#EF4444", stroke: "white", strokeWidth: 1.5 }}
                        activeDot={{ r: 4, fill: "#EF4444", stroke: "white", strokeWidth: 1.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Stock Ticker — compact scrolling low stock */}
          <div className="relative rounded-2xl overflow-hidden border border-destructive/20 bg-destructive/[0.02]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-destructive/10">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className="text-xs font-semibold text-destructive">Stok Menipis</span>
              {lowStock.length > 0 && (
                <span className="text-[10px] font-medium text-destructive/70 ml-auto">{lowStock.length} item</span>
              )}
            </div>
            {loadingLow ? (
              <div className="h-9 bg-muted/50 animate-pulse" />
            ) : lowStock.length === 0 ? (
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">Semua stok dalam batas aman.</p>
              </div>
            ) : (
              <div className="relative h-10 px-3 flex items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={stockIndex}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex items-center gap-1.5 text-xs font-medium text-destructive/90 max-w-full"
                  >
                    {lowStock[stockIndex].itemType === "semi_finished"
                      ? <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                      : <Package className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{lowStock[stockIndex].name}</span>
                    <span className="font-semibold shrink-0 text-destructive">
                      {lowStock[stockIndex].currentStock}
                    </span>
                    <span className="text-destructive/60 shrink-0">{lowStock[stockIndex].unit}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Priority cards row */}
          <div className="grid grid-cols-2 gap-3">
            {loadingSummary ? (
              [1,2,3,4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)
            ) : summary ? (
              <>
                <StatCard title="Penjualan Hari Ini" value={summary.todayRevenue} diff={summary.todayRevenueDiff} icon={Banknote} format="currency" />
                <StatCard title="Pengeluaran Hari Ini" value={summary.todayExpenses} diff={summary.todayExpensesDiff} icon={Wallet} format="currency" />
                <StatCard title="Transaksi" value={summary.todayOrders} diff={summary.todayOrdersDiff} icon={ShoppingCart} />
                <StatCard title="Produk Aktif" value={summary.totalProducts} icon={Package} />
              </>
            ) : null}
          </div>



          {/* Produk Terlaris */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold mb-3">Produk Terlaris</h2>
            {loadingTop ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
            ) : topProducts.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada data penjualan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(topProducts as any[]).map((p, idx) => {
                  const maxSold = (topProducts as any[])[0]?.totalSold ?? 1;
                  const pct = (p.totalSold / maxSold) * 100;
                  return (
                    <div key={p.productId} className="flex items-center gap-3">
                      <span className={`w-5 text-center text-sm font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium truncate">{p.productName}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{p.totalSold} terjual</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary shrink-0">{formatRp(p.totalRevenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kas Masuk/Keluar & Laporan Keuangan */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                Keuangan
                {isAllBranches && <span className="ml-2 text-primary text-xs">Semua Cabang</span>}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {new Date(startDate).toLocaleDateString("id-ID")} — {new Date(endDate).toLocaleDateString("id-ID")}
              </span>
            </div>
            {loadingFinancial ? (
              <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : financial ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Pendapatan</p>
                  <p className="text-base font-bold mt-1">{formatRp(financial?.grossRevenue ?? 0)}</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">HPP (COGS)</p>
                  <p className="text-base font-bold mt-1">{formatRp(financial?.totalCogs ?? 0)}</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Laba Kotor</p>
                  <p className="text-base font-bold mt-1 text-green-600">{formatRp(financial?.grossProfit ?? 0)}</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Margin Kotor</p>
                  <p className="text-base font-bold mt-1">{(financial?.grossMarginPct ?? 0).toFixed(1)}%</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Pengeluaran</p>
                  <p className="text-base font-bold mt-1 text-red-500">{formatRp(financial?.totalExpenses ?? 0)}</p>
                </div>
                <div className="bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Laba Bersih</p>
                  <p className="text-base font-bold mt-1 text-green-600">{formatRp(financial?.netProfit ?? 0)}</p>
                </div>
                <div className="col-span-2 bg-accent/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Margin Bersih</p>
                  <p className="text-base font-bold mt-1">{(financial?.netMarginPct ?? 0).toFixed(1)}%</p>
                </div>
              </div>
            ) : null}
          </div>



          {/* Aktivitas Terbaru — Barang Terjual */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Aktivitas Penjualan
              {isAllBranches && <Badge variant="secondary" className="text-xs ml-1 rounded-full">Semua Cabang</Badge>}
            </h2>

            {loadingSold ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : soldItems.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada data penjualan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {soldItems.slice(0, 10).map((item, idx) => (
                  <div key={`${item.productId}-${item.variantId ?? 'default'}-${idx}`}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.variantName ?? "Reguler"} · {item.totalSold} terjual</p>
                    </div>
                    <span className="text-sm font-semibold text-primary ml-3">{formatRp(item.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performa Kasir */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Performa Kasir
            </h2>
            {loadingCashier ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
            ) : cashierPerf.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(cashierPerf as any[]).map((c, idx) => {
                  const maxRev = (cashierPerf as any[])[0]?.totalRevenue ?? 1;
                  const pct = (c.totalRevenue / maxRev) * 100;
                  return (
                    <div key={c.cashierId} className="flex items-center gap-3">
                      <span className={`w-5 text-center text-sm font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium truncate">{c.cashierName}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{c.totalOrders} transaksi</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary shrink-0">{formatRp(c.totalRevenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
