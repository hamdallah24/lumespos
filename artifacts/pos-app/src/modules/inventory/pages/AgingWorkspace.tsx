import { useState, useMemo } from "react";
import { useBranch } from "@/lib/branch";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import { formatRp } from "@/lib/format";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, Calendar, DollarSign, Package, Filter, Warehouse, Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const bucketColors: Record<string, string> = {
  "0-30": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "31-60": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "61-90": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "91-180": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ">180": "bg-red-500/10 text-red-400 border-red-500/20",
};

const bucketLabels: Record<string, string> = {
  "0-30": "0-30 days",
  "31-60": "31-60 days",
  "61-90": "61-90 days",
  "91-180": "91-180 days",
  ">180": ">180 days",
};

function useAging(branchId: number, warehouseId?: number, itemType?: string) {
  return useQuery<any>({
    queryKey: ["inventory", "aging", branchId, warehouseId, itemType],
    queryFn: async () => {
      const sp = new URLSearchParams({ branchId: String(branchId) });
      if (warehouseId) sp.set("warehouseId", String(warehouseId));
      if (itemType) sp.set("itemType", itemType);
      const r = await apiFetch(`/api/inventory/aging?${sp}`);
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    enabled: !!branchId,
    refetchInterval: 60000,
  });
}

export default function AgingWorkspace() {
  const { branchId } = useBranch();
  const [search, setSearch] = useState("");
  const [showAgingOnly, setShowAgingOnly] = useState(false);

  const { data, isLoading, refetch } = useAging(branchId || 1);

  const filtered = useMemo(() => {
    if (!data?.layers) return [];
    let list = data.layers;
    if (showAgingOnly) list = list.filter((l: any) => l.ageDays >= 90);
    if (search) list = list.filter((l: any) => l.itemName.toLowerCase().includes(search.toLowerCase()) || l.itemType.includes(search.toLowerCase()));
    return list;
  }, [data, search, showAgingOnly]);

  const maxValue = Math.max(...Object.values(data?.buckets || {}).map((b: any) => b.totalValue || 0), 1);

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-base font-bold text-white">Inventory Aging</h1>
              <p className="text-[10px] text-white/30">{data?.summary?.totalLayers || 0} FIFO layers tracked</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Value</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatRp(data?.summary?.totalValue || 0)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Active Layers</p>
            <p className="text-lg font-bold text-white mt-0.5">{data?.summary?.totalLayers || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Aged Items (90d+)</p>
            <p className="text-lg font-bold text-rose-400 mt-0.5">{data?.summary?.agingItemCount || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Aging Value</p>
            <p className="text-lg font-bold text-rose-400 mt-0.5">{formatRp(data?.summary?.agingValue || 0)}</p>
          </div>
        </div>

        {/* Bucket Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(bucketLabels).map(([key, label]) => {
            const bucket = data?.buckets?.[key];
            const pct = maxValue > 0 ? ((bucket?.totalValue || 0) / maxValue) * 100 : 0;
            return (
              <div key={key} className={"rounded-xl p-3 border " + (bucketColors[key] || "bg-white/5 border-white/10")}>
                <p className="text-[9px] font-medium uppercase tracking-wider">{label}</p>
                <p className="text-xs font-bold mt-1">{formatRp(bucket?.totalValue || 0)}</p>
                <p className="text-[9px] mt-0.5 opacity-60">{bucket?.count || 0} layers · {bucket?.totalQty.toFixed(0) || 0} qty</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                  <div className={"h-full rounded-full " + (key === "91-180" || key === ">180" ? "bg-rose-400" : key === "61-90" ? "bg-orange-400" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Aging Trend Mini Chart */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-3 font-medium">Aging Distribution by Value</p>
          <div className="flex items-end gap-1 h-24">
            {Object.entries(bucketLabels).map(([key, label]) => {
              const val = data?.buckets?.[key]?.totalValue || 0;
              const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-white/40 font-medium">{formatRp(val)}</span>
                  <div className="w-full rounded-t-sm" style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: key === ">180" ? "#f43f5e" : key === "91-180" ? "#fb7185" : key === "61-90" ? "#f97316" : key === "31-60" ? "#fbbf24" : "#34d399",
                  }} />
                  <span className="text-[7px] text-white/30">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
          </div>
          <button onClick={() => setShowAgingOnly(!showAgingOnly)}
            className={"h-10 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors " + (showAgingOnly ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/5 text-white/50 hover:text-white/70")}>
            <AlertTriangle className="w-3.5 h-3.5" /> Aged Only (90d+)
          </button>
        </div>

        {/* Aging Items Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Warehouse</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Qty</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Value</th>
                  <th className="text-right px-4 py-3 font-medium">Age (days)</th>
                  <th className="text-center px-4 py-3 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-white/20 text-xs">Loading aging data...</td></tr>
                ) : filtered.length > 0 ? (
                  filtered.map((l: any, i: number) => {
                    const isAged = l.ageDays >= 90;
                    return (
                      <motion.tr key={l.id} {...fadeUp} transition={{ delay: i * 0.01 }}
                        className={"border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors " + (isAged ? "bg-rose-500/[0.03]" : "")}>
                        <td className="px-4 py-3">
                          <p className="text-white text-xs font-medium">{l.itemName}</p>
                          <p className="text-[8px] text-white/20 font-mono">{l.itemType}/{l.itemId}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-white/50 text-[10px]">{l.warehouseName}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/70">{Number(l.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell text-white/50">{formatRp(Number(l.unitCost))}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatRp(Number(l.totalValue))}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={"font-semibold " + (isAged ? "text-rose-400" : "text-white/70")}>{l.ageDays}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={"px-2 py-0.5 rounded text-[9px] font-medium " + (bucketColors[l.bucket] || "bg-white/5 text-white/40")}>{l.bucket}</span>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="text-center py-12">
                    <Calendar className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/20">{search || showAgingOnly ? "No matching aging data" : "No FIFO layers found. Ensure inventory movements have been recorded."}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}