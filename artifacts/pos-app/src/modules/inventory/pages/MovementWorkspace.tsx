import { useState, useMemo } from "react";
import { useRecentMovements, useInventoryDashboard, useInventoryValidation, useWarehouses } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, TrendingDown, Warehouse, Package, Activity, AlertTriangle, BarChart3, CalendarDays, Layers, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRp } from "@/lib/format";
import { KpiCard, MiniBar } from "../components/Widgets";
import type { RecentMovement } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function MovementIcon({ direction }: { direction: string }) {
  return (
    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${direction === "in" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
      {direction === "in" ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowDownRight className="w-2.5 h-2.5 text-rose-400" />}
    </span>
  );
}

export default function MovementWorkspace() {
  const [limit, setLimit] = useState(50);
  const [filterDir, setFilterDir] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: recentMovements, isLoading, refetch, isFetching } = useRecentMovements(limit);
  const { data: dashboard } = useInventoryDashboard();
  const { data: validation } = useInventoryValidation();
  const { data: warehouses } = useWarehouses();

  const filtered = useMemo(() => {
    if (!recentMovements) return [];
    let items = recentMovements;
    if (filterDir !== "all") items = items.filter((m) => m.direction === filterDir);
    if (filterType !== "all") items = items.filter((m) => m.movementType === filterType);
    return items;
  }, [recentMovements, filterDir, filterType]);

  const movementTypes = useMemo(() => {
    if (!recentMovements) return [];
    return [...new Set(recentMovements.map((m) => m.movementType))];
  }, [recentMovements]);

  const inboundCount = useMemo(() => filtered.filter((m) => m.direction === "in").length, [filtered]);
  const outboundCount = useMemo(() => filtered.filter((m) => m.direction === "out").length, [filtered]);

  const whMovement = useMemo(() => {
    if (!recentMovements) return [];
    const map = new Map<string, { name: string; in: number; out: number; items: Set<string> }>();
    recentMovements.forEach((m) => {
      const key = `wh-${m.warehouseId}`;
      if (!map.has(key)) map.set(key, { name: m.warehouseName || `WH #${m.warehouseId}`, in: 0, out: 0, items: new Set() });
      const entry = map.get(key)!;
      if (m.direction === "in") entry.in += Number(m.qtyChange);
      else entry.out += Number(m.qtyChange);
      entry.items.add(`${m.itemType}:${m.itemId}`);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ warehouseId: Number(k.replace("wh-", "")), warehouseName: v.name, in: v.in, out: v.out, items: v.items.size })).sort((a, b) => (b.in + b.out) - (a.in + a.out));
  }, [recentMovements]);

  const dailyTrend = useMemo(() => {
    if (!recentMovements) return [];
    const map = new Map<string, { in: number; out: number }>();
    recentMovements.forEach((m) => {
      const day = format(new Date(m.createdAt), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, { in: 0, out: 0 });
      const d = map.get(day)!;
      if (m.direction === "in") d.in += Number(m.qtyChange);
      else d.out += Number(m.qtyChange);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, in: v.in, out: v.out, total: v.in + v.out }));
  }, [recentMovements]);

  const topItems = useMemo(() => {
    if (!recentMovements) return [];
    const map = new Map<string, { itemType: string; itemId: number; in: number; out: number }>();
    recentMovements.forEach((m) => {
      const key = `${m.itemType}:${m.itemId}`;
      if (!map.has(key)) map.set(key, { itemType: m.itemType, itemId: m.itemId, in: 0, out: 0 });
      const entry = map.get(key)!;
      if (m.direction === "in") entry.in += Number(m.qtyChange);
      else entry.out += Number(m.qtyChange);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (b.in + b.out) - (a.in + a.out)).slice(0, 10);
  }, [recentMovements]);

  const maxTrend = Math.max(...dailyTrend.map((d) => d.total), 1);

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
                <BreadcrumbItem><BreadcrumbPage className="text-white/70">Movement</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Movement Workspace</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 touch-manipulation">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </motion.div>

        {/* KPI ROW */}
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard title="Movement (24h)" value={String(dashboard?.recentMovements || 0)} icon={Activity} color="bg-violet-500/10 text-violet-400" trend={dashboard?.recentMovementsTrend} />
          <KpiCard title="Inbound" value={String(inboundCount)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard title="Outbound" value={String(outboundCount)} icon={TrendingDown} color="bg-rose-500/10 text-rose-400" />
          <KpiCard title="Active WH" value={String(whMovement.length)} icon={Warehouse} color="bg-sky-500/10 text-sky-400" />
          <KpiCard title="Validation" value={dashboard ? `${dashboard.validationScore}%` : "—"} icon={AlertTriangle} color={dashboard?.validationLabel === "Good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} />
          <KpiCard title="Total Items" value={String(dashboard?.totalItems || 0)} icon={Package} color="bg-blue-500/10 text-blue-400" trend={dashboard?.totalItemsTrend} />
        </motion.div>

        {/* ROW 2: Trend + In/Out Comparison */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Movement Trend */}
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Movement Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {dailyTrend.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No movement data</p> : (
                <div className="flex items-end gap-1.5 h-24">
                  {dailyTrend.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex flex-col-reverse" style={{ height: `${(d.total / maxTrend) * 80}%` }}>
                        <div className="w-full bg-rose-500/30 rounded-t-sm" style={{ height: `${(d.out / d.total) * 100}%` }} />
                        <div className="w-full bg-emerald-500/30 rounded-t-sm" style={{ height: `${(d.in / d.total) * 100}%` }} />
                      </div>
                      <span className="text-[7px] text-white/30">{format(new Date(d.date), "dd", { locale: id })}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-[9px] text-white/30">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/50" /> In</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500/50" /> Out</span>
              </div>
            </CardContent>
          </Card>

          {/* Inbound vs Outbound */}
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-amber-400" /> Inbound vs Outbound</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex items-center justify-center gap-6 py-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <ArrowUpRight className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{inboundCount}</p>
                  <p className="text-[10px] text-white/40">Inbound</p>
                </div>
                <div className="text-2xl text-white/20 font-light">vs</div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
                    <ArrowDownRight className="w-6 h-6 text-rose-400" />
                  </div>
                  <p className="text-xl font-bold text-rose-400 mt-1">{outboundCount}</p>
                  <p className="text-[10px] text-white/40">Outbound</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-rose-400 rounded-full transition-all" style={{ width: `${(inboundCount / Math.max(inboundCount + outboundCount, 1)) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ROW 3: By Warehouse + Top Items */}
        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Movement by Warehouse */}
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Warehouse className="w-3.5 h-3.5 text-sky-400" /> Movement by Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5">
              {whMovement.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No data</p> : whMovement.slice(0, 6).map((wh) => (
                <div key={wh.warehouseId} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center"><Warehouse className="w-3 h-3 text-white/40" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/60 truncate">{wh.warehouseName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-emerald-400">{wh.in} in</span>
                      <span className="text-[9px] text-rose-400">{wh.out} out</span>
                      <span className="text-[9px] text-white/30">{wh.items} items</span>
                    </div>
                  </div>
                  <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" style={{ width: `${(wh.in / Math.max(wh.in + wh.out, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Items by Movement */}
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Package className="w-3.5 h-3.5 text-amber-400" /> Top Items by Movement</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1.5">
              {topItems.length === 0 ? <p className="text-xs text-white/20 text-center py-4">No data</p> : topItems.map((item, i) => {
                const total = item.in + item.out;
                return (
                  <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="w-4 text-[9px] text-white/30 text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60 truncate capitalize">{item.itemType} #{item.itemId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-emerald-400">+{item.in}</span>
                        <span className="text-[9px] text-rose-400">-{item.out}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-white/30">
                      <Activity className="w-2.5 h-2.5" /> {total}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* MOVEMENT TIMELINE */}
        <motion.div {...fadeUp}>
          <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-violet-400" /> Movement Timeline</CardTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)} className="h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-[10px] text-white/50 focus:outline-none appearance-none touch-manipulation">
                  <option value="all">All</option>
                  <option value="in">In</option>
                  <option value="out">Out</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-[10px] text-white/50 focus:outline-none appearance-none touch-manipulation">
                  <option value="all">All Types</option>
                  {movementTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-[10px] text-white/50 focus:outline-none appearance-none touch-manipulation">
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 text-white/30 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">No movements recorded</div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {filtered.slice(0, 20).map((mv: RecentMovement) => (
                    <div key={mv.id} className="flex items-center gap-2 sm:gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                      <MovementIcon direction={mv.direction} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/70 capitalize font-medium">{mv.movementType.replace(/_/g, " ")}</span>
                          <span className="text-[8px] text-white/30 bg-white/5 px-1 rounded">{mv.itemType} #{mv.itemId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-white/30">
                          <span>{mv.warehouseName || `WH #${mv.warehouseId}`}</span>
                          <span>{format(new Date(mv.createdAt), "dd MMM HH:mm", { locale: id })}</span>
                          {mv.description && <span className="truncate max-w-[100px]">— {mv.description}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[10px] font-medium ${mv.direction === "in" ? "text-emerald-400" : "text-rose-400"}`}>
                          {mv.direction === "in" ? "+" : "-"}{mv.qtyChange}
                        </p>
                        <p className="text-[8px] text-white/30">bal: {mv.qtyAfter}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/20" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* VALIDATION */}
        {validation && (
          <motion.div {...fadeUp}>
            <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-xs font-semibold text-white/70 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Movement Validation</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {validation.checks.slice(0, 6).map((check) => (
                  <div key={check.name} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${check.status === "passed" ? "bg-emerald-400" : check.status === "warning" ? "bg-amber-400" : check.status === "failed" ? "bg-rose-400" : "bg-sky-400"}`} />
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
    </div>
  );
}