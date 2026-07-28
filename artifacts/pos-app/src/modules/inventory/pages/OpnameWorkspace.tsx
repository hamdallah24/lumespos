import { useState, useMemo } from "react";
import { useRecentMovements, useInventoryDashboard, useInventoryValidation, useInventoryValuation, useWarehouses } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, ClipboardCheck, Package, AlertTriangle, Warehouse, Target, Eye, Scale, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { KpiCard, ValidationBadge } from "../components/Widgets";
import { formatRp } from "@/lib/format";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function OpnameWorkspace() {
  const { data: dashboard, isLoading: dashLoading, refetch, isFetching } = useInventoryDashboard();
  const { data: validation } = useInventoryValidation();
  const { data: valuation } = useInventoryValuation(1);
  const { data: movements } = useRecentMovements(100);
  const { data: warehouses } = useWarehouses();

  const whMap = useMemo(() => {
    const m = new Map<number, string>();
    warehouses?.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [warehouses]);

  const adjustments = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => m.movementType === "ADJUSTMENT" || m.movementType === "adjustment");
  }, [movements]);

  const lowStockItems = dashboard?.lowStockCount || 0;
  const negativeStock = dashboard?.negativeStockCount || 0;
  const outOfStock = dashboard?.outOfStockCount || 0;
  const totalActive = dashboard?.totalItems || 0;
  const stockAccuracy = totalActive > 0 ? Math.max(0, Math.round(((totalActive - negativeStock - lowStockItems) / totalActive) * 100)) : 100;

  const whBreakdown = useMemo(() => {
    if (!dashboard?.warehouseDetail) return [];
    return dashboard.warehouseDetail.map((w) => ({
      ...w,
      accuracy: Math.max(0, Math.round(((w.itemCount - (negativeStock > 0 ? Math.round(negativeStock / Math.max(dashboard.warehouseDetail.length, 1)) : 0)) / Math.max(w.itemCount, 1)) * 100)),
    }));
  }, [dashboard, negativeStock]);

  const needsCount = useMemo(() => {
    if (!valuation) return [];
    return valuation.filter((v) => v.quantity < 10).slice(0, 20);
  }, [valuation]);

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto">
        {/* HEADER */}
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Breadcrumb className="mb-1">
              <BreadcrumbList className="text-[10px] text-white/30">
                <BreadcrumbItem><BreadcrumbLink href="/inventory-workspace" className="text-white/40 hover:text-white/60">Inventory</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Stock Opname</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Stock Opname</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* KPI */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Stock Accuracy" value={`${stockAccuracy}%`} icon={Target} color={stockAccuracy > 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} />
          <KpiCard title="Active Items" value={String(totalActive)} icon={Package} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Low Stock" value={String(lowStockItems)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Out of Stock" value={String(outOfStock)} icon={Eye} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="Negative Stock" value={String(negativeStock)} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
          <KpiCard title="Recent Adjust" value={String(adjustments.length)} icon={Scale} color="bg-violet-500/10 text-violet-400" />
        </motion.div>

        {/* WAREHOUSE ACCURACY */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Warehouse className="w-3.5 h-3.5 text-amber-400" /> Warehouse Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {whBreakdown.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No warehouse data</p>
              : whBreakdown.map((wh) => (
                  <div key={wh.warehouseId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Warehouse className="w-4 h-4 text-white/40" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/70 font-medium">{wh.warehouseName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[8px] text-white/30">
                        <span>{wh.itemCount} items</span>
                        <span>{formatRp(wh.totalValue)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${wh.accuracy >= 90 ? "text-emerald-400" : wh.accuracy >= 70 ? "text-amber-400" : "text-rose-400"}`}>{wh.accuracy}%</p>
                      <div className="w-14 h-1 rounded-full bg-white/5 overflow-hidden mt-0.5">
                        <div className={`h-full rounded-full ${wh.accuracy >= 90 ? "bg-emerald-400" : wh.accuracy >= 70 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${wh.accuracy}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ITEMS NEEDING COUNT + VALIDATION */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><ClipboardCheck className="w-3.5 h-3.5 text-amber-400" /> Items Needing Count</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
              {needsCount.length === 0 ? <p className="text-xs text-white/20 text-center py-4">All items have sufficient stock</p>
              : needsCount.map((item, i) => (
                  <div key={`${item.itemType}-${item.itemId}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="w-4 text-[9px] text-white/30 text-right">{i + 1}.</span>
                    <span className="text-[10px] text-white/60 flex-1 truncate capitalize">{item.itemType} #{item.itemId}</span>
                    <span className={`text-[10px] font-medium ${item.quantity === 0 ? "text-rose-400" : "text-amber-400"}`}>{item.quantity}</span>
                    <span className="text-[9px] text-white/30">{formatRp(item.totalValue)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Validation Report</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
              {!validation ? <p className="text-xs text-white/20 text-center py-4">No validation data</p>
              : validation.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <ValidationBadge status={check.status} />
                    <span className="text-[10px] text-white/60 flex-1 truncate">{check.name.replace(/_/g, " ")}</span>
                    {check.count !== undefined && <span className="text-[9px] text-white/30">{check.count}</span>}
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ADJUSTMENT HISTORY */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-400" /> Adjustment History (Post-Opname)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {adjustments.length === 0 ? <div className="text-center py-6 text-white/30 text-xs">No adjustments recorded</div>
              : <div className="divide-y divide-white/[0.03] max-h-[320px] overflow-y-auto">
                  {adjustments.slice(0, 30).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 sm:gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${a.direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        {a.direction === "in" ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/70 capitalize">{a.itemType} #{a.itemId}</span>
                          <span className={`text-[9px] font-medium ${a.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>{a.direction === "in" ? "+" : "-"}{a.qtyChange}</span>
                        </div>
                        <div className="text-[8px] text-white/30">{a.warehouseName || `WH #${a.warehouseId}`} • {format(new Date(a.createdAt), "dd MMM", { locale: id })}</div>
                      </div>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}