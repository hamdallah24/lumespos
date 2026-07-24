import { useState, useMemo } from "react";
import { useBranch } from "@/lib/branch";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import { formatRp } from "@/lib/format";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Zap, Clock, ShoppingCart, RefreshCw, Layers, PieChart, Activity, ArrowRight, Box, Hash } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function useAnalytics(branchId: number, days = 90) {
  return useQuery<any>({
    queryKey: ["inventory", "analytics", branchId, days],
    queryFn: async () => {
      const r = await apiFetch(`/api/inventory/analytics?branchId=${branchId}&days=${days}`);
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    enabled: !!branchId,
    refetchInterval: 120000,
  });
}

function MiniBar({ data, color = "from-amber-400 to-amber-500", height = 40 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className={"flex-1 rounded-t-sm bg-gradient-to-t " + color + " opacity-60 hover:opacity-100 transition-opacity"}
          style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

const tabLabels: Record<string, string> = {
  overview: "Overview",
  abc: "ABC Analysis",
  movement: "Item Movement",
  deadstock: "Dead Stock",
  forecast: "Forecast",
  reorder: "Reorder",
};

export default function AnalyticsWorkspace() {
  const { branchId } = useBranch();
  const [section, setSection] = useState("overview");
  const { data, isLoading, refetch } = useAnalytics(branchId || 1);

  const summary = data?.summary;

  if (isLoading) return (
    <div className="h-full w-full bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center"><RefreshCw className="w-6 h-6 text-amber-400/50 mx-auto animate-spin mb-2" /><p className="text-xs text-white/30">Loading analytics...</p></div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-base font-bold text-white">Inventory Analytics</h1>
              <p className="text-[10px] text-white/30">Enterprise analytics · 90-day window</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Items</p>
            <p className="text-base font-bold text-white mt-0.5">{summary?.totalItems || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Inventory Value</p>
            <p className="text-base font-bold text-white mt-0.5">{formatRp(summary?.totalValue || 0)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Turnover</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">{data?.turnover?.ratio?.toFixed(2) || "0"}×</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Dead Stock</p>
            <p className="text-base font-bold text-rose-400 mt-0.5">{summary?.deadStockCount || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Need Reorder</p>
            <p className="text-base font-bold text-amber-400 mt-0.5">{summary?.reorderCount || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Low Stock</p>
            <p className="text-base font-bold text-rose-400 mt-0.5">{summary?.lowStockCount || 0}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {Object.entries(tabLabels).map(([key, label]) => (
            <button key={key} onClick={() => setSection(key)}
              className={"shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all " + (section === key ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40 hover:text-white/60")}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── Overview Section ─── */}
        {section === "overview" && (
          <div className="space-y-4">
            {/* ABC Distribution */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2 mb-3"><PieChart className="w-3.5 h-3.5 text-amber-400" /> ABC Distribution</h3>
              <div className="flex gap-3">
                {[{ cat: "A", color: "bg-emerald-500", pct: data?.abc?.items?.filter((i: any) => i.category === "A").length || 0, desc: "Top 80% value" },
                  { cat: "B", color: "bg-amber-500", pct: data?.abc?.bCount || 0, desc: "Next 15%" },
                  { cat: "C", color: "bg-rose-500", pct: data?.abc?.cCount || 0, desc: "Bottom 5%" },
                ].map((c) => (
                  <div key={c.cat} className="flex-1 text-center">
                    <div className={"w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-sm " + c.color}>{c.cat}</div>
                    <p className="text-lg font-bold text-white mt-1">{c.pct}</p>
                    <p className="text-[8px] text-white/30">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Movement Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2 mb-2"><Activity className="w-3.5 h-3.5 text-amber-400" /> Item Movement Classification</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold text-emerald-400">{data?.movement?.fastCount || 0}</p><p className="text-[8px] text-white/30">Fast Moving</p></div>
                  <div><p className="text-lg font-bold text-amber-400">{data?.movement?.slowCount || 0}</p><p className="text-[8px] text-white/30">Slow Moving</p></div>
                  <div><p className="text-lg font-bold text-rose-400">{data?.movement?.deadCount || 0}</p><p className="text-[8px] text-white/30">Dead Stock</p></div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2 mb-2"><TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Top Fast Movers</h3>
                {data?.movement?.items?.slice(0, 5).map((i: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/[0.02] last:border-0">
                    <span className="text-xs text-white/80 truncate max-w-[160px]">{i.name}</span>
                    <span className="text-[10px] text-emerald-400">{i.dailyRate.toFixed(2)}/day</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reorder Alerts */}
            {data?.reorder?.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5" /> Items Needing Attention</h3>
                <div className="space-y-1">
                  {data.reorder.slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/5">
                      <div>
                        <p className="text-xs text-white/80">{r.name} <span className="text-white/30 text-[10px]">({r.code})</span></p>
                        <p className="text-[9px] text-white/30">Stock: {r.currentStock.toFixed(1)} · Reorder at {r.reorderPoint.toFixed(1)}</p>
                      </div>
                      <span className={"text-[10px] font-medium px-2 py-0.5 rounded " + (r.stockStatus === "out_of_stock" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400")}>{r.stockStatus === "out_of_stock" ? "OUT" : "LOW"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ABC Section ─── */}
        {section === "abc" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white">ABC Analysis</h3>
              <p className="text-[9px] text-white/30 mt-0.5">A: {data?.abc?.aCount} · B: {data?.abc?.bCount} · C: {data?.abc?.cCount} · Total Value: {formatRp(data?.abc?.totalValue || 0)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-right px-4 py-3 font-medium">Value</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Qty</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Cum%</th>
                  <th className="text-center px-4 py-3 font-medium">Class</th>
                </tr></thead>
                <tbody>
                  {data?.abc?.items?.map((i: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 text-xs">{i.name}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{formatRp(i.totalValue)}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.totalQty.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.cumPct}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={"px-2 py-0.5 rounded text-[9px] font-bold " + (i.category === "A" ? "bg-emerald-500/20 text-emerald-400" : i.category === "B" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")}>{i.category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Movement Section ─── */}
        {section === "movement" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white">Item Movement Analysis</h3>
              <p className="text-[9px] text-white/30 mt-0.5">Fast: {data?.movement?.fastCount} · Slow: {data?.movement?.slowCount} · Dead: {data?.movement?.deadCount}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-right px-4 py-3 font-medium">Daily Rate</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Stock</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Cover Days</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {data?.movement?.items?.map((i: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 text-xs">{i.name}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{i.dailyRate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.currentStock.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.turnoverDays === 999 ? "∞" : i.turnoverDays.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={"px-2 py-0.5 rounded text-[9px] font-medium " + (i.classification === "fast" ? "bg-emerald-500/20 text-emerald-400" : i.classification === "slow" ? "bg-amber-500/20 text-amber-400" : i.classification === "dead" ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-white/40")}>{i.classification}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Dead Stock Section ─── */}
        {section === "deadstock" && (
          <div className="space-y-3">
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Dead Stock Alert</h3>
              <p className="text-[9px] text-white/30 mt-1">{data?.deadStock?.length || 0} items with no movement in 90+ days</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-right px-4 py-3 font-medium">Stock</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Daily Rate</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Cover Days</th>
                  </tr></thead>
                  <tbody>
                    {data?.deadStock?.map((i: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white/80 text-xs">{i.name}</td>
                        <td className="px-4 py-3 text-right text-rose-400 font-medium">{i.currentStock.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.dailyRate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.turnoverDays === 999 ? "∞" : i.turnoverDays.toFixed(0)}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Forecast Section ─── */}
        {section === "forecast" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Consumption Forecast (Next 30 Days)</h3>
              <p className="text-[9px] text-white/30 mt-0.5">Based on {data?.turnover?.days || 90}-day moving average</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-right px-4 py-3 font-medium">Daily Rate</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Forecast 30d</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Days Left</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {data?.forecast?.map((i: any, idx: number) => {
                    const crit = i.daysUntilOut <= 7;
                    return (
                      <tr key={idx} className={"border-b border-white/[0.02] hover:bg-white/[0.02] " + (crit ? "bg-rose-500/[0.03]" : "")}>
                        <td className="px-4 py-3 text-white/80 text-xs">{i.name}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{i.dailyRate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{i.forecast30.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-white">{i.currentStock.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className={crit ? "text-rose-400 font-semibold" : "text-white/50"}>{i.daysUntilOut === 0 ? "0" : i.daysUntilOut.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={"px-2 py-0.5 rounded text-[9px] font-medium " + (crit ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                            {crit ? "Critical" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Reorder Section ─── */}
        {section === "reorder" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-rose-400">{summary?.outOfStockCount || 0}</p>
                <p className="text-[9px] text-white/40">Out of Stock</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-amber-400">{summary?.lowStockCount || 0}</p>
                <p className="text-[9px] text-white/40">Low Stock</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{summary?.reorderCount || 0}</p>
                <p className="text-[9px] text-white/40">Need Reorder</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-right px-4 py-3 font-medium">Stock</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Daily Rate</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Lead Time</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Reorder At</th>
                    <th className="text-right px-4 py-3 font-medium">Suggest Qty</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {data?.reorder?.map((r: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="text-white/80 text-xs">{r.name}</p>
                          <p className="text-[8px] text-white/20 font-mono">{r.code}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={r.stockStatus === "out_of_stock" ? "text-rose-400 font-semibold" : "text-white"}>{r.currentStock.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{r.dailyRate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{r.leadTime}d</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50">{r.reorderPoint.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-semibold">{r.suggestedQty}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={"px-2 py-0.5 rounded text-[9px] font-medium " + (r.stockStatus === "out_of_stock" ? "bg-rose-500/20 text-rose-400" : r.stockStatus === "low" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>{r.stockStatus.replace("_", " ")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}