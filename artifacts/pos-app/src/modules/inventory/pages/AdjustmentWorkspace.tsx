import { useState, useMemo } from "react";
import { useRecentMovements, useWarehouses, useInventoryDashboard, useInventoryValidation } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, Clock, X, ChevronRight, AlertTriangle, Scale, Package, User, FileText, Hash } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { KpiCard, ValidationBadge } from "../components/Widgets";
import type { RecentMovement } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function AdjustmentDetail({ entry, onClose }: { entry: RecentMovement; onClose: () => void }) {
  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0d1128] border-l border-white/10 shadow-2xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Scale className="w-4 h-4 text-amber-400" /> Adjustment Detail</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 touch-manipulation"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <InfoBlock label="Item" value={`${entry.itemType} #${entry.itemId}`} icon={<Package className="w-3 h-3" />} />
          <InfoBlock label="Direction" value={entry.direction === "in" ? "Increase" : "Decrease"} icon={entry.direction === "in" ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />} />
          <InfoBlock label="Qty Change" value={`${entry.direction === "in" ? "+" : "-"}${entry.qtyChange}`} />
          <InfoBlock label="Balance After" value={entry.qtyAfter} />
          <InfoBlock label="Unit Cost" value={entry.unitCost ? `Rp${Number(entry.unitCost).toLocaleString()}` : "—"} />
          <InfoBlock label="Date" value={format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: id })} />
          <InfoBlock label="Warehouse" value={entry.warehouseName || `WH #${entry.warehouseId}`} />
          {entry.referenceType && <InfoBlock label="Reference" value={entry.referenceType} />}
        </div>
        {entry.description && (
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Reason</p>
            <p className="text-xs text-white/60">{entry.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoBlock({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}<p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xs font-medium text-white/70 mt-0.5 capitalize">{value}</p>
    </div>
  );
}

export default function AdjustmentWorkspace() {
  const [selected, setSelected] = useState<RecentMovement | null>(null);
  const { data: movements, isLoading, refetch, isFetching } = useRecentMovements(200);
  const { data: dashboard } = useInventoryDashboard();
  const { data: validation } = useInventoryValidation();

  const adjustments = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => m.movementType === "ADJUSTMENT" || m.movementType === "adjustment");
  }, [movements]);

  const adjIn = useMemo(() => adjustments.filter((a) => a.direction === "in"), [adjustments]);
  const adjOut = useMemo(() => adjustments.filter((a) => a.direction === "out"), [adjustments]);

  const reasons = useMemo(() => {
    const map = new Map<string, number>();
    adjustments.forEach((a) => {
      const r = a.description || "No reason";
      map.set(r, (map.get(r) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [adjustments]);

  const adjByItem = useMemo(() => {
    const map = new Map<string, { in: number; out: number; count: number }>();
    adjustments.forEach((a) => {
      const key = `${a.itemType}:${a.itemId}`;
      if (!map.has(key)) map.set(key, { in: 0, out: 0, count: 0 });
      const d = map.get(key)!;
      if (a.direction === "in") d.in += Number(a.qtyChange);
      else d.out += Number(a.qtyChange);
      d.count++;
    });
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.count - a.count);
  }, [adjustments]);

  const netChange = adjIn.length - adjOut.length;

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
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Adjustment</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Stock Adjustment</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* KPI */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Total Adjustments" value={String(adjustments.length)} icon={Scale} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Increase" value={String(adjIn.length)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Decrease" value={String(adjOut.length)} icon={TrendingDown} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="Net Change" value={(netChange >= 0 ? "+" : "") + netChange} icon={Package} color={netChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"} />
          <KpiCard title="Items Adjusted" value={String(adjByItem.length)} icon={Hash} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Validation" value={dashboard ? `${dashboard.validationScore}%` : "—"} icon={AlertTriangle} color={dashboard?.validationLabel === "Good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} />
        </motion.div>

        {/* ADJUSTMENT REASONS + ITEMS */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-amber-400" /> Adjustment Reasons</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5">
              {reasons.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No data</p>
              : reasons.slice(0, 8).map(([reason, count]) => (
                  <div key={reason} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate">{reason}</span>
                    <span className="text-[10px] text-white/40 font-medium">{count}x</span>
                    <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / Math.max(...reasons.map(([, c]) => c), 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Package className="w-3.5 h-3.5 text-sky-400" /> Most Adjusted Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5">
              {adjByItem.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No data</p>
              : adjByItem.slice(0, 8).map((item) => (
                  <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate capitalize">{item.key}</span>
                    <span className="text-[10px] text-emerald-400">+{item.in}</span>
                    <span className="text-[10px] text-rose-400">-{item.out}</span>
                    <span className="text-[9px] text-white/30">{item.count}x</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* TIMELINE */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-400" /> Adjustment History <span className="text-white/30 font-normal">({adjustments.length} entries)</span></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 text-white/30 animate-spin" /></div>
              : adjustments.length === 0 ? <div className="text-center py-8 text-white/30 text-xs">No adjustments recorded</div>
              : <div className="divide-y divide-white/[0.03]">
                  {adjustments.map((a) => (
                    <div key={a.id} onClick={() => setSelected(a)} className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer touch-manipulation">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${a.direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        {a.direction === "in" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/70 font-medium capitalize">{a.itemType} #{a.itemId}</span>
                          <span className={`text-[9px] font-medium ${a.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>{a.direction === "in" ? "+" : "-"}{a.qtyChange}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-white/30">
                          <span>{a.warehouseName || `WH #${a.warehouseId}`}</span>
                          <span>{format(new Date(a.createdAt), "dd MMM HH:mm", { locale: id })}</span>
                          {a.description && <span className="truncate max-w-[80px]">— {a.description}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>
        </motion.div>

        {/* VALIDATION */}
        {validation && (
          <motion.div {...fadeUp}>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Adjustment Validation</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {validation.checks.slice(0, 6).map((check) => (
                  <div key={check.name} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <ValidationBadge status={check.status} />
                      <p className="text-[9px] text-white/60 truncate">{check.name.replace(/_/g, " ")}</p>
                    </div>
                    <p className="text-[8px] text-white/30 mt-0.5 truncate">{check.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selected && <><div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} /><AdjustmentDetail entry={selected} onClose={() => setSelected(null)} /></>}
      </AnimatePresence>
    </div>
  );
}