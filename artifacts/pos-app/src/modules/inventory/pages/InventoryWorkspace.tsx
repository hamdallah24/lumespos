import { useState, useMemo } from "react";
import { useBranch } from "@/lib/branch";
import { useInventoryDashboard, useWarehouses, useInventoryValidation, useRecentMovements, useInventoryValuation } from "../hooks/useInventory";
import { formatRp } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { InvKpiCard, InvGlassCard, InvSectionHeader, InvTable, InvDrawer, InvEmptyState } from "@/lib/inventory/InventoryComponents";
import type { WarehouseDetail } from "../types/workspace";
import {
  DollarSign, Package as PackageIcon, AlertTriangle, Ban, Box, ShieldCheck,
  TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight, User,
  Calendar, Layers, ChevronDown, ChevronUp, Warehouse as WarehouseIcon,
  Zap, PieChart, Clock, BarChart3, ShoppingCart, ArrowRight, Filter,
} from "lucide-react";

// ─── AI Rule Engine (data-driven, no dummy) ───
function generateRecommendations(dash: any, movements: any[], validation: any) {
  const recs: any[] = [];
  if (dash?.lowStockCount > 0) recs.push({
    type: "reorder", severity: dash.lowStockCount > 5 ? "high" : "medium",
    title: "Low Stock Reorder", description: `${dash.lowStockCount} item di bawah minimum. Segera reorder.`,
    action: "Cek Low Stock", source: "dashboard",
  });
  if (dash?.negativeStockCount > 0) recs.push({
    type: "abnormal", severity: "high",
    title: "Negative Stock", description: `${dash.negativeStockCount} item memiliki stok negatif.`,
    action: "Cek Adjustment", source: "validation",
  });
  if ((dash?.validationScore || 0) < 60) recs.push({
    type: "abnormal", severity: "high",
    title: "Validation Low", description: `Skor ${dash.validationScore} — perlu perhatian.`,
    action: "Run Validation", source: "validation",
  });
  if (recs.length === 0) recs.push({
    type: "normal", severity: "low",
    title: "Inventory Stable", description: `${dash?.totalItems || 0} SKU · ${dash?.warehouseDetail?.length || 0} gudang · semua normal.`,
    source: "dashboard",
  });
  return recs.slice(0, 4);
}

// ─── Movement Row ───
const MOVE_STYLE: Record<string, string> = {
  supplier_receipt: "text-emerald-400 bg-emerald-500/10", sales_consumption: "text-rose-400 bg-rose-500/10",
  warehouse_transfer: "text-sky-400 bg-sky-500/10", manual_adjustment: "text-amber-400 bg-amber-500/10",
  production_output: "text-violet-400 bg-violet-500/10", waste_damage: "text-red-400 bg-red-500/10",
  branch_transfer: "text-cyan-400 bg-cyan-500/10", stock_opname: "text-indigo-400 bg-indigo-500/10",
  inbound: "text-emerald-400 bg-emerald-500/10", outbound: "text-rose-400 bg-rose-500/10",
};

export default function InventoryWorkspace() {
  const { branchId, currentBranch } = useBranch();
  const { data: dash, isLoading } = useInventoryDashboard(branchId ?? undefined);
  const { data: warehouses } = useWarehouses(branchId ?? undefined);
  const { data: validation } = useInventoryValidation(branchId ?? undefined);
  const { data: movements } = useRecentMovements(20);
  const { data: valuation } = useInventoryValuation(branchId ?? undefined);
  const [selectedWh, setSelectedWh] = useState<WarehouseDetail | null>(null);
  const [dtOpen, setDtOpen] = useState(true);

  const whList = dash?.warehouseDetail || [];
  const checks = validation?.checks || [];
  const passed = checks.filter(c => c.status === "passed").length;
  const failed = checks.filter(c => c.status === "failed").length;

  const recommendations = useMemo(() => (dash && movements && validation) ? generateRecommendations(dash, movements, validation) : [], [dash, movements, validation]);

  // Movement trend from real data (last 7 days)
  const trend = useMemo(() => {
    const bins: number[] = [0, 0, 0, 0, 0, 0, 0];
    if (!movements?.length) return bins;
    const now = Date.now();
    for (const m of movements) {
      const dayIdx = Math.floor((now - new Date(m.createdAt).getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) bins[6 - dayIdx]++;
    }
    return bins;
  }, [movements]);

  const dayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) labels.push(format(new Date(Date.now() - i * 86400000), "EEEEE", { locale: id }).toUpperCase());
    return labels;
  }, []);

  const maxTrend = Math.max(...trend, 1);

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        {/* KPI Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 animate-pulse">
                <div className="h-2.5 w-12 bg-white/[0.06] rounded mb-2" /><div className="h-5 w-16 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <InvKpiCard title="Inventory Value" value={formatRp(dash?.totalValue || 0)} icon={DollarSign} color="bg-blue-500/15 text-blue-400" trend={dash?.totalValueTrend ? { value: dash.totalValueTrend.change, direction: dash.totalValueTrend.direction } : undefined} />
            <InvKpiCard title="Total SKU" value={String(dash?.totalItems || 0)} icon={PackageIcon} color="bg-emerald-500/15 text-emerald-400" trend={dash?.totalItemsTrend ? { value: dash.totalItemsTrend.change, direction: dash.totalItemsTrend.direction } : undefined} />
            <InvKpiCard title="Low Stock" value={String(dash?.lowStockCount || 0)} icon={AlertTriangle} color="bg-orange-500/15 text-orange-400" trend={dash?.lowStockTrend ? { value: dash.lowStockTrend.change, direction: dash.lowStockTrend.direction } : undefined} />
            <InvKpiCard title="Out of Stock" value={String(dash?.outOfStockCount || 0)} icon={Ban} color="bg-rose-500/15 text-rose-400" />
            <InvKpiCard title="Warehouses" value={String(whList.length)} icon={WarehouseIcon} color="bg-violet-500/15 text-violet-400" />
            <InvKpiCard title="Validation" value={`${dash?.validationScore || 0}%`} icon={ShieldCheck} color={(dash?.validationScore || 0) >= 70 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"} subtitle={dash?.validationLabel || ""} />
          </div>
        )}

        {/* AI Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {recommendations.map((r, i) => {
            const colorMap: Record<string, string> = {
              reorder: "border-orange-500/20 bg-orange-500/[0.04]", abnormal: "border-red-500/20 bg-red-500/[0.04]",
              normal: "border-emerald-500/20 bg-emerald-500/[0.04]", imbalance: "border-amber-500/20 bg-amber-500/[0.04]",
            };
            const iconMap: Record<string, any> = {
              reorder: ShoppingCart, abnormal: AlertTriangle, normal: ShieldCheck, imbalance: ArrowRight,
            };
            const sevColor: Record<string, string> = { high: "text-red-400", medium: "text-amber-400", low: "text-emerald-400" };
            const Icon = iconMap[r.type] || Activity;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border p-3 ${colorMap[r.type] || "border-white/[0.06] bg-white/[0.03]"}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor[r.severity] || "text-white/50"}`} />
                  <div>
                    <p className="text-[11px] font-semibold text-white">{r.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{r.description}</p>
                    {r.action && <p className="text-[9px] text-amber-400 mt-1 font-medium">{r.action} →</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Digital Twin + Movement + Validation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Digital Twin: Warehouse Cards */}
          <InvGlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white">Digital Twin</h3>
              </div>
              <button onClick={() => setDtOpen(!dtOpen)} className="text-white/30 hover:text-white/60">
                {dtOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {dtOpen && (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {whList.length > 0 ? whList.map((wh, i) => {
                  const util = wh.itemCount > 0 ? Math.min(100, Math.round((wh.movementIn + wh.movementOut) / Math.max(wh.itemCount, 1) * 40)) : 0;
                  return (
                    <button key={wh.warehouseId || i} onClick={() => setSelectedWh(wh)}
                      className="w-full text-left bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-xs font-medium text-white">{wh.warehouseName}</span>
                        </div>
                        <span className="text-[10px] text-white/40">{wh.itemCount} items</span>
                      </div>
                      <div className="flex justify-between mt-1.5 text-[10px] text-white/40">
                        <span>{formatRp(wh.totalValue)}</span>
                        <span className="text-emerald-400">+{wh.movementIn}</span>
                        <span className="text-rose-400">-{wh.movementOut}</span>
                      </div>
                      <div className="mt-1.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-500 to-amber-500 transition-all" style={{ width: `${util}%` }} />
                      </div>
                    </button>
                  );
                }) : <p className="text-[10px] text-white/20 text-center py-4">No warehouse data</p>}
              </div>
            )}
          </InvGlassCard>

          {/* Movement Timeline */}
          <InvGlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-white">Latest Movements</h3>
              </div>
              <span className="text-[9px] text-white/20">{movements?.length || 0} rec</span>
            </div>
            <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
              {movements?.slice(0, 10).map(mv => {
                const isIn = mv.direction === "in";
                const c = MOVE_STYLE[mv.movementType] || "text-white/60 bg-white/[0.04]";
                return (
                  <div key={mv.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isIn ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                      {isIn ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${c}`}>{mv.movementType.replace(/_/g, " ")}</span>
                        <span className="text-[9px] text-white/25">{format(new Date(mv.createdAt), "HH:mm", { locale: id })}</span>
                      </div>
                      <p className="text-[9px] text-white/20 truncate mt-0.5">{mv.description || mv.referenceType || ""}</p>
                    </div>
                    <p className={`text-[10px] font-bold shrink-0 ${isIn ? "text-emerald-400" : "text-rose-400"}`}>{isIn ? "+" : ""}{Math.abs(parseFloat(mv.qtyChange))}</p>
                  </div>
                );
              })}
              {(!movements || movements.length === 0) && <p className="text-[10px] text-white/20 text-center py-6">No recent movements</p>}
            </div>
          </InvGlassCard>

          {/* Validation + Valuation */}
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Health & Value</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-emerald-400">{passed}</p>
                <p className="text-[8px] text-white/30">Passed</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/10 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-red-400">{failed}</p>
                <p className="text-[8px] text-white/30">Failed</p>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              {checks.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.status === "passed" ? "bg-emerald-400" : c.status === "failed" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-white/50 truncate">{c.name}</span>
                  {c.count != null && <span className="text-white/20 ml-auto">{c.count}</span>}
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.04] pt-3">
              <p className="text-xs font-semibold text-white">{formatRp(dash?.totalValue || 0)}</p>
              <p className="text-[9px] text-white/25 mt-0.5">Total FIFO Valuation</p>
              {valuation?.slice(0, 4).map((v, i) => {
                const pct = dash?.totalValue ? (v.totalValue / dash.totalValue * 100) : 0;
                const cols = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];
                return (
                  <div key={i} className="flex items-center gap-2 mt-1.5">
                    <div className={`w-2 h-2 rounded-full ${cols[i % 4]}`} />
                    <span className="text-[9px] text-white/40 flex-1 truncate">{v.itemName}</span>
                    <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cols[i % 4]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[9px] text-white/50 w-16 text-right">{formatRp(v.totalValue)}</span>
                  </div>
                );
              })}
            </div>
          </InvGlassCard>
        </div>

        {/* Movement Trend */}
        <InvGlassCard animate={false}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">7-Day Movement Trend</h3>
          </div>
          <div className="h-20 flex items-end justify-between gap-1 px-1">
            {trend.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/30">{v > 0 ? v : ""}</span>
                <div className="w-full rounded-t-sm bg-gradient-to-t from-sky-500/40 to-sky-400 transition-all" style={{ height: `${maxTrend > 0 ? (v / maxTrend) * 100 : 0}%`, minHeight: v > 0 ? 4 : 0 }} />
                <span className="text-[7px] text-white/20">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </InvGlassCard>

        {/* Warehouse Table */}
        <InvGlassCard animate={false}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-white">Warehouse Explorer</h3>
            </div>
            <span className="text-[9px] text-white/20">{whList.length} warehouses</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/[0.04] text-white/25">
                  <th className="text-left py-2 px-3 font-medium">Warehouse</th>
                  <th className="text-right py-2 px-3 font-medium">Items</th>
                  <th className="text-right py-2 px-3 font-medium">Value</th>
                  <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">In</th>
                  <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Out</th>
                  <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Util</th>
                </tr>
              </thead>
              <tbody>
                {whList.map((wh, i) => (
                  <tr key={wh.warehouseId || i} onClick={() => setSelectedWh(wh)}
                    className="border-b border-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-colors">
                    <td className="py-2.5 px-3 text-white font-medium">{wh.warehouseName}</td>
                    <td className="py-2.5 px-3 text-right text-white/50">{wh.itemCount}</td>
                    <td className="py-2.5 px-3 text-right text-white">{formatRp(wh.totalValue)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 hidden sm:table-cell">+{wh.movementIn}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400 hidden sm:table-cell">-{wh.movementOut}</td>
                    <td className="py-2.5 px-3 text-right text-white/40 hidden sm:table-cell">{wh.utilization || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InvGlassCard>
      </div>

      {/* Warehouse Detail Drawer */}
      <AnimatePresence>
        {selectedWh && (
          <InvDrawer open={!!selectedWh} onClose={() => setSelectedWh(null)} title={selectedWh.warehouseName || "Warehouse Detail"}>
            <div className="space-y-3">
              <InvKpiCard title="Total Value" value={formatRp(selectedWh.totalValue)} icon={DollarSign} color="bg-blue-500/15 text-blue-400" animate={false} />
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Items</p>
                  <p className="text-base font-bold text-white mt-0.5">{selectedWh.itemCount}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Utilization</p>
                  <p className="text-base font-bold text-white mt-0.5">{selectedWh.utilization || 0}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-500/[0.06] border border-emerald-500/10 rounded-xl p-3">
                  <p className="text-[9px] text-white/30">Movement In</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">+{selectedWh.movementIn}</p>
                </div>
                <div className="bg-rose-500/[0.06] border border-rose-500/10 rounded-xl p-3">
                  <p className="text-[9px] text-white/30">Movement Out</p>
                  <p className="text-base font-bold text-rose-400 mt-0.5">-{selectedWh.movementOut}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Utilization</p>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" style={{ width: `${selectedWh.utilization || 0}%` }} />
                </div>
              </div>
            </div>
          </InvDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}