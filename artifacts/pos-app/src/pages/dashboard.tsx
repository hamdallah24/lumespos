import {
  useGetDashboardSummary,
  useGetTopProducts,
  useGetSalesChart,
} from "@workspace/api-client-react";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, Banknote } from "lucide-react";

function StatCard({
  title,
  value,
  diff,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number;
  diff?: number;
  icon: React.ElementType;
  format?: "currency" | "number";
}) {
  const isPositive = (diff ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1.5 tracking-tight">
              {format === "currency" ? formatRp(value) : value.toLocaleString("id-ID")}
            </p>
            {diff !== undefined && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(diff).toFixed(1)}% vs kemarin</span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
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

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: topProducts = [], isLoading: loadingTop } = useGetTopProducts({ limit: 5 });
  const { data: chartData = [], isLoading: loadingChart } = useGetSalesChart();

  const formattedChart = chartData.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 border-b px-6 flex items-center bg-card shrink-0">
        <h1 className="font-bold text-xl tracking-tight">Laporan Penjualan</h1>
        <Badge variant="outline" className="ml-3 text-xs">Hari Ini</Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingSummary ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
            ) : summary ? (
              <>
                <StatCard title="Pendapatan Hari Ini" value={summary.todayRevenue} diff={summary.todayRevenueDiff} icon={Banknote} format="currency" />
                <StatCard title="Transaksi Hari Ini" value={summary.todayOrders} diff={summary.todayOrdersDiff} icon={ShoppingCart} />
                <StatCard title="Total Produk Aktif" value={summary.totalProducts} icon={Package} />
                <div>
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
                </div>
              </>
            ) : null}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area Chart */}
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
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(14 90% 48%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(14 90% 48%)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - daily orders */}
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

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTop ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Belum ada data penjualan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => {
                    const maxSold = topProducts[0]?.totalSold ?? 1;
                    const pct = (p.totalSold / maxSold) * 100;
                    return (
                      <div key={p.productId} className="flex items-center gap-4">
                        <div className="w-6 text-center">
                          <span className={`text-sm font-bold ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>#{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium truncate">{p.productName}</span>
                            <span className="text-sm text-muted-foreground ml-2 shrink-0">{p.totalSold} terjual</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
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
        </div>
      </ScrollArea>
    </div>
  );
}
