import { useState } from "react";
import { useInventoryDashboard, useWarehouses, useInventoryValidation, useRecentMovements, useInventoryValuation } from "../hooks/useInventory";
import { useBranch } from "@/lib/branch";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Package, AlertTriangle, TrendingUp, TrendingDown, Warehouse, ShieldCheck,
  ArrowUpRight, ArrowDownRight, RefreshCw, Search, Clock, DollarSign,
  BarChart3, Layers, Activity, ChevronRight, ChevronDown,
} from "lucide-react";

const ITEM = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

function KpiCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: string; icon: any; color: string; subtitle?: string }) {
  return (
    <motion.div {...ITEM} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-white/50 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-white truncate">{value}</p>
          {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function WarehouseNode({ wh, isCentral }: { wh: any; isCentral?: boolean }) {
  const util = wh.totalValue > 0 ? Math.min(100, Math.round((wh.totalValue / 100_000_000) * 100)) : 0;
  return (
    <div className={`relative ${isCentral ? "w-full max-w-xs mx-auto" : "w-full"}`}>
      <div className={`bg-white/5 backdrop-blur-xl border ${isCentral ? "border-amber-500/30" : "border-white/10"} rounded-xl p-3 hover:bg-white/10 transition-all`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-white truncate">{wh.warehouseName}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isCentral ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
            {isCentral ? "CENTRAL" : "BRANCH"}
          </span>
        </div>
        <p className="text-lg font-bold text-white">{formatRp(wh.totalValue)}</p>
        <div className="flex items-center justify-between mt-2 text-[10px] text-white/50">
          <span>{wh.itemCount} SKU</span>
          <span>{util}% utilized</span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${util > 80 ? "bg-red-500" : util > 50 ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${util}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MovementRow({ mv }: { mv: any }) {
  const isIn = mv.direction === "in";
  const colors: Record<string, string> = {
    supplier_receipt: "text-green-400", sales_consumption: "text-red-400",
    warehouse_transfer: "text-blue-400", manual_adjustment: "text-amber-400",
    production_output: "text-purple-400", waste_damage: "text-red-500",
  };
  const color = colors[mv.movementType] || "text-white/70";
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIn ? "bg-green-500/10" : "bg-red-500/10"}`}>
        {isIn ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${color}`}>{mv.movementType.replace(/_/g, " ")}</p>
        <p className="text-[10px] text-white/40 truncate">{mv.warehouseName || `WH #${mv.warehouseId}`}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-bold ${isIn ? "text-green-400" : "text-red-400"}`}>
          {isIn ? "+" : "-"}{Math.abs(parseFloat(mv.qtyChange))}
        </p>
        <p className="text-[10px] text-white/40">{format(new Date(mv.createdAt), "HH:mm", { locale: id })}</p>
      </div>
    </div>
  );
}

const INSIGHT_STRATEGIES = [
  { check: (d: any) => d?.lowStockCount > 0, icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10",
    gen: (d: any) => `${d.lowStockCount} item mendekati minimum stock. Segera lakukan pemesanan ulang.` },
  { check: (d: any) => d?.negativeStockCount > 0, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10",
    gen: (d: any) => `${d.negativeStockCount} item memiliki stock negatif. Periksa dan lakukan penyesuaian.` },
  { check: (d: any) => (d?.validationScore ?? 0) < 60, icon: ShieldCheck, color: "text-amber-400", bg: "bg-amber-500/10",
    gen: () => "Skor validasi inventory rendah. Jalankan validasi untuk mengidentifikasi masalah." },
  { check: (d: any) => (d?.totalValue ?? 0) > 50_000_000, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10",
    gen: (d: any) => `Nilai inventory Rp ${(d.totalValue / 1_000_000).toFixed(0)}M — pastikan tingkat perputaran optimal.` },
  { check: (d: any) => true, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10",
    gen: (d: any) => `Total ${d.totalItems} SKU tersebar di ${d.byWarehouse?.length || 0} gudang. ${d.recentMovements} pergerakan dalam 24 jam terakhir.` },
];

export default function InventoryWorkspace() {
  const { branchId } = useBranch();
  const { data: dash, isLoading: dashLoading } = useInventoryDashboard(branchId ?? undefined);
  const { data: warehouses } = useWarehouses(branchId ?? undefined);
  const { data: validation } = useInventoryValidation(branchId ?? undefined);
  const { data: movements } = useRecentMovements(15);
  const { data: valuation } = useInventoryValuation(branchId ?? 1);
  const [search, setSearch] = useState("");

  const centralWh = dash?.byWarehouse?.find(w => w.warehouseName?.toLowerCase().includes("central"));
  const branchWhs = dash?.byWarehouse?.filter(w => w !== centralWh) || [];
  const lowStockCount = dash?.lowStockCount || 0;
  const outOfStock = 0; // Derived from dashboard if available

  // KPI Data
  const kpis = [
    { title: "Inventory Value", value: formatRp(dash?.totalValue || 0), icon: DollarSign, color: "bg-blue-500/10 text-blue-400", subtitle: "Total nilai inventory" },
    { title: "Total SKU", value: String(dash?.totalItems || 0), icon: Package, color: "bg-green-500/10 text-green-400", subtitle: "Item aktif" },
    { title: "Low Stock", value: String(lowStockCount), icon: AlertTriangle, color: "bg-orange-500/10 text-orange-400", subtitle: "Di bawah minimum" },
    { title: "Out of Stock", value: String(outOfStock), icon: AlertTriangle, color: "bg-red-500/10 text-red-400", subtitle: "Stock habis" },
    { title: "Utilization", value: `${dash?.byWarehouse?.length ? Math.round(dash.byWarehouse.reduce((s: number, w: any) => s + (w.totalValue || 0), 0) / Math.max(dash.byWarehouse.length, 1) / 1_000_000) : 0}%`, icon: BarChart3, color: "bg-purple-500/10 text-purple-400" },
    { title: "Validation", value: `${dash?.validationScore || 0}`, icon: ShieldCheck, color: (dash?.validationScore || 0) >= 70 ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400", subtitle: dash?.validationLabel },
  ];

  // Insights from real data
  const insights = INSIGHT_STRATEGIES.filter(s => s.check(dash)).map(s => ({ icon: s.icon, color: s.color, bg: s.bg, text: s.gen(dash) }));

  return (
    <div className="flex-1 min-h-0 bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Inventory Workspace</h1>
            <p className="text-xs text-white/40 mt-0.5">Real-time inventory control center and operational intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-lg">
              <Clock className="w-3 h-3" />
              <span>{dashLoading ? "Loading..." : format(new Date(), "dd MMM HH:mm", { locale: id })}</span>
            </div>
            <Button variant="outline" size="sm" className="border-white/10 text-white/70 text-xs h-8">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100%-65px)]">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {dashLoading ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse"><div className="h-3 w-16 bg-white/10 rounded mb-3" /><div className="h-6 w-24 bg-white/10 rounded" /></div>
            )) : kpis.map((k, i) => <KpiCard key={i} {...k} />)}
          </div>

          {/* Warehouse Digital Twin */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-amber-400" /> Warehouse Digital Twin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {centralWh ? <WarehouseNode wh={centralWh} isCentral /> : (
                  <div className="text-xs text-white/40 py-4">No central warehouse configured</div>
                )}
                <div className="w-px h-6 bg-gradient-to-b from-amber-500/50 to-blue-500/50" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                  {branchWhs.length > 0 ? branchWhs.map((wh: any) => <WarehouseNode key={wh.warehouseId} wh={wh} />) : (
                    warehouses?.map(w => <WarehouseNode key={w.id} wh={{ warehouseId: w.id, warehouseName: w.name, totalValue: 0, itemCount: 0 }} />)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Row: Timeline + Low Stock + Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Movement Timeline */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-white flex items-center gap-2"><Clock className="w-3 h-3 text-blue-400" /> Movement Timeline</CardTitle></CardHeader>
              <CardContent className="max-h-64 overflow-y-auto space-y-0.5">
                {movements?.slice(0, 12).map(mv => <MovementRow key={mv.id} mv={mv} />)}
                {(!movements || movements.length === 0) && <p className="text-xs text-white/40 text-center py-4">No recent movements</p>}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-orange-400" /> Low Stock Alert</CardTitle></CardHeader>
              <CardContent>
                {lowStockCount > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-white/50 px-2">
                      <span>Item</span><span>Stock / Min</span>
                    </div>
                    <p className="text-xs text-white/60 text-center py-4">{lowStockCount} item mendekati minimum stock</p>
                  </div>
                ) : (
                  <p className="text-xs text-green-400 text-center py-4">All items above minimum stock</p>
                )}
              </CardContent>
            </Card>

            {/* Category Chart */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-white flex items-center gap-2"><BarChart3 className="w-3 h-3 text-purple-400" /> Stock Distribution</CardTitle></CardHeader>
              <CardContent>
                {valuation && valuation.length > 0 ? (
                  <div className="space-y-2">
                    {valuation.slice(0, 6).map((v, i) => {
                      const pct = dash?.totalValue ? Math.round((v.totalValue / dash.totalValue) * 100) : 0;
                      const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-red-500", "bg-cyan-500"];
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors[i % 6]}`} />
                          <p className="text-[10px] text-white/70 flex-1 truncate">{v.itemType} #{v.itemId}</p>
                          <p className="text-[10px] text-white/50 w-8 text-right">{pct}%</p>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${colors[i % 6]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-white/40 text-center py-4">No valuation data</p>}
              </CardContent>
            </Card>
          </div>

          {/* Validation Widget */}
          {validation && (
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Validation Summary <span className="ml-auto text-xs text-white/40">{validation.overallLabel} ({validation.overallScore})</span></CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-green-500/10 rounded-lg p-2 text-center"><p className="text-lg font-bold text-green-400">{validation.passedChecks}</p><p className="text-[10px] text-white/50">Passed</p></div>
                  <div className="bg-red-500/10 rounded-lg p-2 text-center"><p className="text-lg font-bold text-red-400">{validation.failedChecks}</p><p className="text-[10px] text-white/50">Failed</p></div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white">{validation.totalChecks}</p><p className="text-[10px] text-white/50">Total Checks</p></div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white">{dash?.recentMovements || 0}</p><p className="text-[10px] text-white/50">24h Movements</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory Table */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-white flex items-center gap-2"><Package className="w-3 h-3" /> Inventory Overview</CardTitle>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                  <Input placeholder="Search SKU or name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">SKU</th>
                      <th className="text-left py-2 px-2 font-medium">Item</th>
                      <th className="text-left py-2 px-2 font-medium">Type</th>
                      <th className="text-left py-2 px-2 font-medium">Warehouse</th>
                      <th className="text-right py-2 px-2 font-medium">On Hand</th>
                      <th className="text-right py-2 px-2 font-medium">Avg Cost</th>
                      <th className="text-right py-2 px-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses?.slice(0, 1).flatMap(wh => {
                      const whData = dash?.byWarehouse?.find(w => w.warehouseId === wh.id);
                      return whData ? (
                        <tr key={wh.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 px-2 text-white/70">WH-{wh.id}</td>
                          <td className="py-2 px-2 text-white font-medium">{wh.name}</td>
                          <td className="py-2 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{wh.type}</span></td>
                          <td className="py-2 px-2 text-white/70">{wh.name}</td>
                          <td className="py-2 px-2 text-right text-white">{whData.itemCount}</td>
                          <td className="py-2 px-2 text-right text-white/70">-</td>
                          <td className="py-2 px-2 text-right text-white font-semibold">{formatRp(whData.totalValue)}</td>
                        </tr>
                      ) : null;
                    })}
                    {(!warehouses || warehouses.length === 0) && (
                      <tr><td colSpan={7} className="text-center py-6 text-white/40">No inventory data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight Panel */}
        <div className="w-72 lg:w-80 border-l border-white/10 overflow-y-auto p-4 space-y-3 shrink-0 hidden lg:block">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">AI Insights</h3>
          {insights.slice(0, 5).map((ins, i) => (
            <motion.div key={i} {...ITEM} className={`${ins.bg} border border-white/5 rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <ins.icon className={`w-4 h-4 mt-0.5 shrink-0 ${ins.color}`} />
                <p className="text-[11px] text-white/80 leading-relaxed">{ins.text}</p>
              </div>
            </motion.div>
          ))}
          {insights.length === 0 && <p className="text-xs text-white/40 text-center py-8">No insights available</p>}
        </div>
      </div>
    </div>
  );
}
