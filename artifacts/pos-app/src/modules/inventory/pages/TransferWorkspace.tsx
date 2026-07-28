import { useState, useMemo } from "react";
import { useRecentMovements, useWarehouses, useInventoryDashboard } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, RefreshCw, Warehouse, Package, TrendingUp, TrendingDown, Clock, X, ChevronRight, GitCompare, Building2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { KpiCard } from "../components/Widgets";
import type { RecentMovement } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function TransferDetail({ entry, whNames, onClose }: { entry: RecentMovement; whNames: Map<number, string>; onClose: () => void }) {
  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0d1128] border-l border-white/10 shadow-2xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-amber-400" /> Transfer Detail</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 touch-manipulation"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Movement Type</p>
            <p className="text-xs font-medium text-white/70 capitalize mt-0.5">{entry.movementType.replace(/_/g, " ")}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Direction</p>
            <p className={`text-xs font-medium mt-0.5 ${entry.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>{entry.direction === "in" ? "Inbound" : "Outbound"}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 col-span-2">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Warehouse</p>
            <p className="text-xs font-medium text-white/70 mt-0.5">{whNames.get(entry.warehouseId) || `WH #${entry.warehouseId}`}</p>
          </div>
          <InfoBlock label="Item" value={`${entry.itemType} #${entry.itemId}`} />
          <InfoBlock label="Qty" value={`${entry.direction === "in" ? "+" : "-"}${entry.qtyChange}`} />
          <InfoBlock label="Balance After" value={entry.qtyAfter} />
          <InfoBlock label="Unit Cost" value={entry.unitCost ? `Rp${Number(entry.unitCost).toLocaleString()}` : "—"} />
          <InfoBlock label="Date" value={format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: id })} />
          {entry.referenceType && <InfoBlock label="Reference" value={entry.referenceType} />}
        </div>
        {entry.description && (
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Description</p>
            <p className="text-xs text-white/60 mt-0.5">{entry.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
      <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-white/70 mt-0.5 capitalize">{value}</p>
    </div>
  );
}

export default function TransferWorkspace() {
  const [selected, setSelected] = useState<RecentMovement | null>(null);

  const { data: movements, isLoading, refetch, isFetching } = useRecentMovements(200);
  const { data: warehouses } = useWarehouses();
  const { data: dashboard } = useInventoryDashboard();

  const whNames = useMemo(() => {
    const m = new Map<number, string>();
    warehouses?.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [warehouses]);

  const transfers = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => m.movementType === "TRANSFER" || m.movementType === "transfer");
  }, [movements]);

  const inboundTransfers = useMemo(() => transfers.filter((t) => t.direction === "in"), [transfers]);
  const outboundTransfers = useMemo(() => transfers.filter((t) => t.direction === "out"), [transfers]);

  const whFlow = useMemo(() => {
    const pairs: { from: number; to: number; count: number }[] = [];
    const map = new Map<string, { count: number }>();
    transfers.forEach((t) => {
      const key = `${t.warehouseId}-${t.direction}`;
      if (!map.has(key)) map.set(key, { count: 0 });
      map.get(key)!.count += 1;
    });
    return map;
  }, [transfers]);

  const whTraffic = useMemo(() => {
    const map = new Map<number, { in: number; out: number }>();
    transfers.forEach((t) => {
      const w = t.warehouseId;
      if (!map.has(w)) map.set(w, { in: 0, out: 0 });
      const d = map.get(w)!;
      if (t.direction === "in") d.in += Number(t.qtyChange);
      else d.out += Number(t.qtyChange);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ warehouseId: id, warehouseName: whNames.get(id) || `WH #${id}`, ...v }));
  }, [transfers, whNames]);

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
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Transfer</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Transfer Management</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* KPI ROW */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Total Transfers" value={String(transfers.length)} icon={ArrowRightLeft} color="bg-amber-500/10 text-amber-400" />
          <KpiCard title="Inbound" value={String(inboundTransfers.length)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Outbound" value={String(outboundTransfers.length)} icon={TrendingDown} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="WH Involved" value={String(whTraffic.length)} icon={Building2} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Total Qty In" value={String(whTraffic.reduce((s, w) => s + w.in, 0))} icon={Package} color="bg-blue-500/10 text-blue-400" />
          <KpiCard title="Total Qty Out" value={String(whTraffic.reduce((s, w) => s + w.out, 0))} icon={Package} color="bg-violet-500/10 text-violet-400" />
        </motion.div>

        {/* WAREHOUSE FLOW */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><GitCompare className="w-3.5 h-3.5 text-amber-400" /> Warehouse Flow</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {whTraffic.length === 0 ? <p className="text-xs text-white/20 text-center py-4 col-span-full">No transfer data</p>
              : whTraffic.map((wh) => {
                  const total = wh.in + wh.out;
                  const inPct = total > 0 ? (wh.in / total) * 100 : 0;
                  return (
                    <div key={wh.warehouseId} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-white/60 truncate font-medium">{wh.warehouseName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400"><ArrowUpRight className="w-2.5 h-2.5" />{wh.in}</div>
                        <div className="flex items-center gap-1 text-[10px] text-rose-400"><ArrowDownRight className="w-2.5 h-2.5" />{wh.out}</div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-1.5">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" style={{ width: `${inPct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </motion.div>

        {/* TRANSFER TIMELINE */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-400" /> Transfer History <span className="text-white/30 font-normal">({transfers.length} entries)</span></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 text-white/30 animate-spin" /></div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">No transfers recorded yet</div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {transfers.map((t) => (
                    <div key={t.id} onClick={() => setSelected(t)} className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer touch-manipulation">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        {t.direction === "in" ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/70 font-medium capitalize">{t.itemType} #{t.itemId}</span>
                          <span className={`text-[9px] font-medium ${t.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>{t.direction === "in" ? "+" : "-"}{t.qtyChange}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-white/30">
                          <span>{whNames.get(t.warehouseId) || `WH #${t.warehouseId}`}</span>
                          <span>{format(new Date(t.createdAt), "dd MMM HH:mm", { locale: id })}</span>
                          {t.description && <span className="truncate max-w-[80px]">— {t.description}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* TRANSFER ANALYTICS */}
        {transfers.length > 0 && (
          <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Inbound by WH</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1.5">
                {whTraffic.filter((w) => w.in > 0).sort((a, b) => b.in - a.in).slice(0, 5).map((wh) => (
                  <div key={wh.warehouseId} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate">{wh.warehouseName}</span>
                    <span className="text-[10px] text-emerald-400 font-medium">+{wh.in}</span>
                    <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min((wh.in / Math.max(...whTraffic.map((x) => x.in), 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Outbound by WH</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1.5">
                {whTraffic.filter((w) => w.out > 0).sort((a, b) => b.out - a.out).slice(0, 5).map((wh) => (
                  <div key={wh.warehouseId} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-white/60 flex-1 truncate">{wh.warehouseName}</span>
                    <span className="text-[10px] text-rose-400 font-medium">-{wh.out}</span>
                    <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min((wh.out / Math.max(...whTraffic.map((x) => x.out), 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selected && <><div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} /><TransferDetail entry={selected} whNames={whNames} onClose={() => setSelected(null)} /></>}
      </AnimatePresence>
    </div>
  );
}