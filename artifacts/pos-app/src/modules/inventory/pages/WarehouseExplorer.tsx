import { useState, useMemo } from "react";
import { useWarehouses, useInventoryDashboard, useRecentMovements, useInventoryValidation } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, RefreshCw, TrendingUp, TrendingDown, Package, DollarSign, Activity, AlertTriangle, X, Layers, ChevronRight, Clock, ArrowUpRight, ArrowDownRight, Building2, Goal, Percent } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { KpiCard, ValidationBadge } from "../components/Widgets";
import { formatRp } from "@/lib/format";
import type { RecentMovement } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function WhDetail({ wh, movements, onClose }: { wh: any; movements: RecentMovement[]; onClose: () => void }) {
  const whMovements = movements.filter((m) => m.warehouseId === wh.warehouseId).slice(0, 20);

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0d1128] border-l border-white/10 shadow-2xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Warehouse className="w-4 h-4 text-amber-400" /> {wh.warehouseName}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 touch-manipulation"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase">Value</p>
            <p className="text-sm font-bold text-white mt-0.5">{formatRp(wh.totalValue)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase">Items</p>
            <p className="text-sm font-bold text-white mt-0.5">{wh.itemCount}</p>
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
          <p className="text-[9px] text-white/30 uppercase mb-2">Utilization</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${wh.utilization > 80 ? "bg-rose-400" : wh.utilization > 50 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(wh.utilization, 100)}%` }} />
            </div>
            <span className="text-sm font-bold text-white">{wh.utilization}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-400" /><p className="text-[9px] text-white/30 uppercase">Movement In</p></div>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">{wh.movementIn}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5"><TrendingDown className="w-3 h-3 text-rose-400" /><p className="text-[9px] text-white/30 uppercase">Movement Out</p></div>
            <p className="text-sm font-bold text-rose-400 mt-0.5">{wh.movementOut}</p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-[9px] text-white/30 uppercase mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Recent Movements</p>
          {whMovements.length === 0 ? <p className="text-xs text-white/20 text-center py-3">No movements</p>
          : <div className="space-y-1">
              {whMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className={`w-5 h-5 rounded flex items-center justify-center ${m.direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    {m.direction === "in" ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowDownRight className="w-2.5 h-2.5 text-rose-400" />}
                  </span>
                  <span className="text-[10px] text-white/60 flex-1 truncate capitalize">{m.movementType.replace(/_/g, " ")}</span>
                  <span className={`text-[9px] font-medium ${m.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>{m.direction === "in" ? "+" : "-"}{m.qtyChange}</span>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </motion.div>
  );
}

export default function WarehouseExplorer() {
  const [selectedWh, setSelectedWh] = useState<any>(null);
  const { data: warehouses, isLoading: whLoading, refetch, isFetching } = useWarehouses();
  const { data: dashboard } = useInventoryDashboard();
  const { data: movements } = useRecentMovements(100);
  const { data: validation } = useInventoryValidation();

  const whDetails = dashboard?.warehouseDetail || [];

  const totalValue = whDetails.reduce((s, w) => s + w.totalValue, 0);
  const totalItems = whDetails.reduce((s, w) => s + w.itemCount, 0);
  const avgUtil = whDetails.length > 0 ? Math.round(whDetails.reduce((s, w) => s + w.utilization, 0) / whDetails.length) : 0;

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
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Warehouse Explorer</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Warehouse Explorer</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* KPI */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Warehouses" value={String(whDetails.length)} icon={Building2} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Total Value" value={formatRp(totalValue)} icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Total Items" value={String(totalItems)} icon={Package} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Avg Utilization" value={`${avgUtil}%`} icon={Percent} color={avgUtil > 80 ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400"} />
          <KpiCard title="Movement (7d)" value={String(dashboard?.recentMovements || 0)} icon={Activity} color="bg-violet-500/10 text-violet-400" />
          <KpiCard title="Validation" value={dashboard ? `${dashboard.validationScore}%` : "—"} icon={AlertTriangle} color={dashboard?.validationLabel === "Good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} />
        </motion.div>

        {/* WAREHOUSE GRID */}
        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {whLoading ? <div className="col-span-full text-center py-8"><RefreshCw className="w-4 h-4 text-white/30 animate-spin mx-auto" /></div>
          : whDetails.length === 0 ? <div className="col-span-full text-center py-8 text-white/30 text-xs">No warehouse data</div>
          : whDetails.map((wh) => (
              <div key={wh.warehouseId} onClick={() => setSelectedWh(wh)} className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:bg-white/[0.06] transition-all cursor-pointer touch-manipulation group">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Warehouse className="w-4.5 h-4.5 text-amber-400" /></div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-white mt-2">{wh.warehouseName}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div><p className="text-[8px] text-white/30">Value</p><p className="text-[10px] text-white/70 font-medium truncate">{formatRp(wh.totalValue)}</p></div>
                  <div><p className="text-[8px] text-white/30">Items</p><p className="text-[10px] text-white/70 font-medium">{wh.itemCount}</p></div>
                  <div><p className="text-[8px] text-white/30">Util</p><p className={`text-[10px] font-medium ${wh.utilization > 80 ? "text-rose-400" : wh.utilization > 50 ? "text-amber-400" : "text-emerald-400"}`}>{wh.utilization}%</p></div>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${wh.utilization > 80 ? "bg-rose-400" : wh.utilization > 50 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(wh.utilization, 100)}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-2 text-[8px] text-white/30">
                  <span className="flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> {wh.movementIn}</span>
                  <span className="flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5 text-rose-400" /> {wh.movementOut}</span>
                </div>
              </div>
            ))}
        </motion.div>

        {/* VALIDATION */}
        {validation && (
          <motion.div {...fadeUp}>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Warehouse Health</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {validation.checks.slice(0, 6).map((check) => (
                  <div key={check.name} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-1.5"><ValidationBadge status={check.status} /><span className="text-[9px] text-white/60 truncate">{check.name.replace(/_/g, " ")}</span></div>
                    <p className="text-[8px] text-white/30 mt-0.5 truncate">{check.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selectedWh && <><div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedWh(null)} /><WhDetail wh={selectedWh} movements={movements || []} onClose={() => setSelectedWh(null)} /></>}
      </AnimatePresence>
    </div>
  );
}