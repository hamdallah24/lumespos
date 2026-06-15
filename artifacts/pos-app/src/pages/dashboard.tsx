import React, { useState, useMemo } from "react";
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
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, Banknote, Users, Wallet, Receipt,
  Percent, FlaskConical, Building2, LayoutGrid,
} from "lucide-react";

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ title, value, diff, icon: Icon, format = "number" }: {
  title: string; value: number; diff?: number;
  icon: React.ElementType; format?: "currency" | "number";
}) {
  const isPositive = (diff ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight truncate">
              {format === "currency" ? formatRp(value) : value.toLocaleString("id-ID")}
            </p>
            {diff !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(diff).toFixed(1)}% vs kemarin</span>
              </div>
            )}
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ml-2">
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (active && payload?.length) {
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-muted-foreground">
            {p.name === "revenue" ? "Pendapatan: " : "Transaksi: "}
            <span className="font-medium text-foreground">
              {p.name === "revenue" ? formatRp(p.value) : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { branchId, currentBranch } = useBranch();
  const { data: branchesRaw } = useListBranches();
  const allBranches = Array.isArray(branchesRaw) ? branchesRaw as { id: number; name: string }[] : [];

  // Toggle semua cabang vs cabang aktif
  const [showAllBranches, setShowAllBranches] = useState(false);
  const activeBranchId = showAllBranches ? undefined : (branchId ?? undefined);
  const params = { branchId: activeBranchId };

  // Filter barang terjual
  const [filterProduct, setFilterProduct] = useState<number | null>(null);
  const [filterVariant, setFilterVariant] = useState<string | null>(null);
  const [reportDays, setReportDays] = useState(30);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(params);
  const { data: topProducts = [], isLoading: loadingTop } = useGetTopProducts({ limit: 5, branchId: activeBranchId });
  const { data: chartData = [], isLoading: loadingChart } = useGetSalesChart(params);
  const { data: cashierPerf = [], isLoading: loadingCashier } = useGetCashierPerformance(params);
  const { data: financial, isLoading: loadingFinancial } = useGetFinancialReport({ branchId: activeBranchId, days: reportDays });
  const { data: lowStock = [], isLoading: loadingLow } = useGetLowStock(params);

  // Fetch sold items via direct fetch (endpoint baru)
  const [soldItems, setSoldItems] = useState<any[]>([]);
  const [loadingSold, setLoadingSold] = useState(false);

  React.useEffect(() => {
    setLoadingSold(true);
    const url = activeBranchId
      ? `/api/dashboard/sold-items?branchId=${activeBranchId}&days=${reportDays}`
      : `/api/dashboard/sold-items?days=${reportDays}`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setSoldItems(Array.isArray(data) ? data : []); })
      .catch(() => setSoldItems([]))
      .finally(() => setLoadingSold(false));
  }, [activeBranchId, reportDays]);

  // Unique produk & varian untuk filter
  const uniqueProducts = useMemo(() => {
    const map = new Map<number, string>();
    soldItems.forEach((i) => map.set(i.productId, i.productName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [soldItems]);

  const uniqueVariants = useMemo(() => {
    if (!filterProduct) return [];
    const map = new Map<string, string>();
    soldItems
      .filter((i) => i.productId === filterProduct && i.variantName)
      .forEach((i) => map.set(i.variantName, i.variantName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [soldItems, filterProduct]);

  const filteredSoldItems = useMemo(() => {
    return soldItems.filter((i) => {
      if (filterProduct && i.productId !== filterProduct) return false;
      if (filterVariant && i.variantName !== filterVariant) return false;
      return true;
    });
  }, [soldItems, filterProduct, filterVariant]);

  const formattedChart = chartData.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 md:h-16 border-b px-4 md:px-6 flex items-center gap-3 bg-card shrink-0 flex-wrap">
        <h1 className="font-bold text-lg md:text-xl tracking-tight">Laporan Penjualan</h1>

        {/* Toggle cabang */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={!showAllBranches ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setShowAllBranches(false)}
          >
            <Building2 className="w-3 h-3 mr-1" />
            {currentBranch?.name ?? "Cabang Ini"}
          </Button>
          <Button
            size="sm"
            variant={showAllBranches ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setShowAllBranches(true)}
          >
            <LayoutGrid className="w-3 h-3 mr-1" />
            Semua Cabang
          </Button>
        </div>

        {showAllBranches && (
          <Badge variant="secondary" className="text-xs">
            {allBranches.length} cabang
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">

          {/* Peringatan Stok */}
          {(loadingLow || lowStock.length > 0) && (
            <Card className={lowStock.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-5 h-5 ${lowStock.length > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
                  <h2 className={`font-semibold ${lowStock.length > 0 ? "text-destructive" : ""}`}>
                    Peringatan Stok Menipis {lowStock.length > 0 && `(${lowStock.length})`}
                  </h2>
                </div>
                {loadingLow ? (
                  <div className="h-8 bg-muted rounded animate-pulse" />
                ) : lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Semua stok dalam batas aman.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lowStock.map((it) => (
                      <Badge key={`${it.itemType}-${it.itemId}`} variant="destructive" className="gap-1.5">
                        {it.itemType === "semi_finished" ? <FlaskConical className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {it.name}: {it.currentStock} {it.unit}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Filter Periode */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Periode laporan:</span>
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={reportDays === d ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => setReportDays(d)}
              >
                {d} Hari
              </Button>
            ))}
          </div>

          {/* Laporan Keuangan */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Laporan Keuangan ({reportDays} Hari)
              {showAllBranches && <span className="ml-2 text-primary">— Semua Cabang</span>}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loadingFinancial ? (
                [1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
              ) : financial ? (
                <>
                  <StatCard title="Pendapatan Kotor" value={financial.grossRevenue} icon={Wallet} format="currency" />
                  <StatCard title="Total HPP (COGS)" value={financial.totalCogs} icon={Receipt} format="currency" />
                  <StatCard title="Laba Kotor" value={financial.grossProfit} icon={Banknote} format="currency" />
                  <Card>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs md:text-sm text-muted-foreground font-medium">Margin Kotor</p>
                          <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight">{financial.grossMarginPct.toFixed(1)}%</p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ml-2">
                          <Percent className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          </div>

          {/* Summary Hari Ini */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingSummary ? (
              [1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
            ) : summary ? (
              <>
                <StatCard title="Pendapatan Hari Ini" value={summary.todayRevenue} diff={summary.todayRevenueDiff} icon={Banknote} format="currency" />
                <StatCard title="Transaksi Hari Ini" value={summary.todayOrders} diff={summary.todayOrdersDiff} icon={ShoppingCart} />
                <StatCard title="Total Produk Aktif" value={summary.totalProducts} icon={Package} />
                <Card className={summary.lowStockCount > 0 ? "border-orange-200 bg-orange-50/50" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Stok Hampir Habis</p>
                        <p className="text-2xl font-bold mt-1.5 tracking-tight">{summary.lowStockCount}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">produk stok ≤ 5</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.lowStockCount > 0 ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary"}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tren Pendapatan 7 Hari</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingChart ? (
                  <div className="h-56 bg-muted/50 rounded-lg animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={formattedChart} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(14 90% 48%)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(14 90% 48%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(14 90% 48%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Transaksi per Hari</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingChart ? (
                  <div className="h-56 bg-muted/50 rounded-lg animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={formattedChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="orders" name="orders" fill="hsl(14 90% 48%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail Barang Terjual */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Detail Barang Terjual
                {showAllBranches && <Badge variant="secondary" className="text-xs ml-1">Semua Cabang</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter produk & varian */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant={filterProduct === null ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => { setFilterProduct(null); setFilterVariant(null); }}
                >
                  Semua Menu
                </Button>
                {uniqueProducts.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={filterProduct === p.id ? "default" : "outline"}
                    className="text-xs h-7"
                    onClick={() => { setFilterProduct(p.id); setFilterVariant(null); }}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>

              {/* Filter varian — hanya muncul kalau ada produk dipilih */}
              {filterProduct && uniqueVariants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    variant={filterVariant === null ? "default" : "outline"}
                    className="text-xs h-7"
                    onClick={() => setFilterVariant(null)}
                  >
                    Semua Ukuran
                  </Button>
                  {uniqueVariants.map((v) => (
                    <Button
                      key={v.id}
                      size="sm"
                      variant={filterVariant === v.id ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => setFilterVariant(v.id)}
                    >
                      {v.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Tabel barang terjual */}
              {loadingSold ? (
                <div className="space-y-2">
                  {[1,2,3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
                </div>
              ) : filteredSoldItems.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Belum ada data penjualan</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 px-3 py-2 bg-muted text-[11px] font-medium text-muted-foreground">
                    <span className="col-span-5">Produk</span>
                    <span className="col-span-3">Varian/Ukuran</span>
                    <span className="col-span-2 text-right">Terjual</span>
                    <span className="col-span-2 text-right">Revenue</span>
                  </div>
                  {filteredSoldItems.map((item, idx) => (
                    <div
                      key={`${item.productId}-${item.variantId ?? 'default'}-${idx}`}
                      className={`grid grid-cols-12 px-3 py-2.5 text-xs border-t items-center ${idx % 2 === 0 ? "" : "bg-muted/30"}`}
                    >
                      <span className="col-span-5 font-medium truncate">{item.productName}</span>
                      <span className="col-span-3 text-muted-foreground">
                        {item.variantName ?? <span className="italic">—</span>}
                      </span>
                      <span className="col-span-2 text-right font-semibold">{item.totalSold}</span>
                      <span className="col-span-2 text-right text-primary font-semibold">{formatRp(item.totalRevenue)}</span>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="grid grid-cols-12 px-3 py-2.5 text-xs border-t bg-muted font-semibold">
                    <span className="col-span-5">Total</span>
                    <span className="col-span-3"></span>
                    <span className="col-span-2 text-right">
                      {filteredSoldItems.reduce((a, i) => a + i.totalSold, 0)}
                    </span>
                    <span className="col-span-2 text-right text-primary">
                      {formatRp(filteredSoldItems.reduce((a, i) => a + i.totalRevenue, 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produk Terlaris & Performa Kasir */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Produk Terlaris</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTop ? (
                  <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
                ) : topProducts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Belum ada data penjualan</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(topProducts as any[]).map((p, idx) => {
                      const maxSold = (topProducts as any[])[0]?.totalSold ?? 1;
                      const pct = (p.totalSold / maxSold) * 100;
                      return (
                        <div key={p.productId} className="flex items-center gap-4">
                          <span className={`w-6 text-center text-sm font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium truncate">{p.productName}</span>
                              <span className="text-sm text-muted-foreground ml-2 shrink-0">{p.totalSold} terjual</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-primary shrink-0">{formatRp(p.totalRevenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" /> Performa Kasir
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCashier ? (
                  <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
                ) : cashierPerf.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Belum ada data kasir</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(cashierPerf as any[]).map((c, idx) => {
                      const maxRev = (cashierPerf as any[])[0]?.totalRevenue ?? 1;
                      const pct = (c.totalRevenue / maxRev) * 100;
                      return (
                        <div key={c.cashierId} className="flex items-center gap-4">
                          <span className={`w-6 text-center text-sm font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium truncate">{c.cashierName}</span>
                              <span className="text-sm text-muted-foreground ml-2 shrink-0">{c.totalOrders} transaksi</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-primary shrink-0">{formatRp(c.totalRevenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}