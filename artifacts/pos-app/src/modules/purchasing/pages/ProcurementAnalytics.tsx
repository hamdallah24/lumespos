import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Truck, DollarSign, Clock, Target, RefreshCw } from "lucide-react";
import { usePurchasingDashboard, usePurchaseOrders, useSuppliers, useGoodsReceipts } from "../hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";
import { formatRp } from "@/lib/format";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ProcurementAnalytics() {
  const { data: dashboard, isLoading } = usePurchasingDashboard();
  const { data: pos } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: grs } = useGoodsReceipts();
  const [section, setSection] = useState("overview");

  const totalSpend = pos?.filter(p => ["completed", "partial", "sent"].includes(p.status)).reduce((s, p) => s + Number(p.totalAmount), 0) || 0;
  const completedPOs = pos?.filter(p => p.status === "completed").length || 0;
  const avgPOValue = pos && pos.length > 0 ? totalSpend / pos.length : 0;

  const monthlySpend = (pos || [])
    .filter(p => ["completed", "partial", "sent"].includes(p.status))
    .reduce((acc: Record<string, number>, p) => {
      const month = p.orderDate?.slice(0, 7) || "Unknown";
      acc[month] = (acc[month] || 0) + Number(p.totalAmount);
      return acc;
    }, {} as Record<string, number>);

  const monthlyEntries = Object.entries(monthlySpend).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const maxMonthly = Math.max(...monthlyEntries.map(([, v]) => v), 1);

  const supplierStats = (dashboard?.supplierPerformance || []).sort((a, b) => b.poCount - a.poCount).slice(0, 10);
  const statusDist = (pos || []).reduce((acc: Record<string, number>, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const tabs: [string, string][] = [["overview", "Overview"], ["spend", "Spend Trend"], ["suppliers", "Suppliers"], ["status", "Status Dist"]];

  if (isLoading) return (
    <div className="h-full w-full bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center"><RefreshCw className="w-6 h-6 text-orange-400/50 mx-auto animate-spin mb-2" /><p className="text-xs text-white/30">Loading analytics...</p></div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        <InvSectionHeader icon={BarChart3} title="Procurement Analytics" subtitle="Analitik purchasing komprehensif" />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <InvKpiCard title="Total Spend" value={formatRp(totalSpend)} icon={DollarSign} color="bg-orange-500/15 text-orange-400" />
          <InvKpiCard title="PO Selesai" value={String(completedPOs)} icon={Truck} color="bg-emerald-500/15 text-emerald-400" />
          <InvKpiCard title="Rata-rata PO" value={formatRp(avgPOValue)} icon={TrendingUp} color="bg-blue-500/15 text-blue-400" />
          <InvKpiCard title="Supplier Aktif" value={String(suppliers?.length || 0)} icon={Truck} color="bg-violet-500/15 text-violet-400" />
          <InvKpiCard title="Open PO" value={String(dashboard?.openPOs || 0)} icon={Clock} color="bg-amber-500/15 text-amber-400" />
          <InvKpiCard title="Menunggu GR" value={String(dashboard?.goodsWaitingReceipt || 0)} icon={Target} color="bg-cyan-500/15 text-cyan-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setSection(key)}
              className={"shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all " + (section === key ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40 hover:text-white/60")}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {section === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InvGlassCard>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold text-white">Tren Pengeluaran</h3>
              </div>
              {monthlyEntries.length > 0 ? (
                <div className="flex items-end gap-1 h-32">
                  {monthlyEntries.map(([month, value]) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-0.5" title={`${month}: ${formatRp(value)}`}>
                      <span className="text-[8px] text-white/30">{Math.round(value / 1000)}k</span>
                      <div className="w-full bg-orange-400/40 rounded-t" style={{ height: `${(value / maxMonthly) * 100}%` }} />
                      <span className="text-[8px] text-white/20">{month.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-white/30 py-8 text-center">Belum ada data</div>}
            </InvGlassCard>

            <InvGlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold text-white">Top Supplier</h3>
              </div>
              <div className="space-y-2">
                {supplierStats.map((sp, i) => {
                  const maxPO = Math.max(...supplierStats.map(s => s.poCount), 1);
                  return (
                    <div key={sp.supplierId} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 w-4 text-right">{i + 1}</span>
                      <span className="text-[10px] text-white/40 w-24 truncate">{sp.supplierName}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-orange-400/50" style={{ width: `${(sp.poCount / maxPO) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-6 text-right">{sp.poCount}</span>
                    </div>
                  );
                })}
                {supplierStats.length === 0 && <p className="text-xs text-white/20 text-center py-4">No data</p>}
              </div>
            </InvGlassCard>

            <InvGlassCard>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold text-white">Ringkasan</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <div className="text-lg font-bold text-orange-400">{pos?.length || 0}</div>
                  <div className="text-[10px] text-white/40">Total PO</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-lg font-bold text-emerald-400">{grs?.length || 0}</div>
                  <div className="text-[10px] text-white/40">Total GR</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="text-lg font-bold text-blue-400">{formatRp(totalSpend)}</div>
                  <div className="text-[10px] text-white/40">Total Spend</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="text-lg font-bold text-amber-400">{dashboard?.validationScore || 0}%</div>
                  <div className="text-[10px] text-white/40">Validasi Score</div>
                </div>
              </div>
            </InvGlassCard>

            <InvGlassCard>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold text-white">Status PO</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(statusDist).map(([status, count]) => {
                  const total = pos?.length || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = status === "completed" ? "bg-emerald-400" : status === "sent" || status === "partial" ? "bg-orange-400" : status === "draft" ? "bg-slate-400" : "bg-amber-400";
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-16 capitalize">{status}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}/50`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-8 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>
          </div>
        )}

        {/* Spend Trend */}
        {section === "spend" && (
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-white">Tren Pengeluaran (12 Bulan)</h3>
            </div>
            {monthlyEntries.length > 0 ? (
              <div className="flex items-end gap-1 h-48 min-w-[400px]">
                {monthlyEntries.map(([month, value]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1" title={`${month}: ${formatRp(value)}`}>
                    <span className="text-[8px] text-white/30">{formatRp(value)}</span>
                    <div className="w-full bg-orange-400/40 rounded-t hover:bg-orange-400/60 transition-colors" style={{ height: `${(value / maxMonthly) * 100}%` }} />
                    <span className="text-[8px] text-white/20">{month.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs text-white/30 py-8 text-center">Belum ada data pengeluaran</div>}
          </InvGlassCard>
        )}

        {/* Suppliers */}
        {section === "suppliers" && (
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-white">Supplier Ranking</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-right px-4 py-3 font-medium">PO Count</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">GR Count</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierStats.map((sp, i) => {
                    const maxPO = Math.max(...supplierStats.map(s => s.poCount), 1);
                    return (
                      <tr key={sp.supplierId} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white/30">{i + 1}</td>
                        <td className="px-4 py-3 text-white/80 font-medium">{sp.supplierName}</td>
                        <td className="px-4 py-3 text-right text-orange-400 font-medium">{sp.poCount}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 hidden sm:table-cell">{sp.receiptCount}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-orange-400/50" style={{ width: `${(sp.poCount / maxPO) * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-white/30">{Math.round((sp.poCount / Math.max(pos?.length || 1, 1)) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </InvGlassCard>
        )}

        {/* Status Distribution */}
        {section === "status" && (
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-white">Status Distribution</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(statusDist).map(([status, count]) => {
                const total = pos?.length || 1;
                const pct = Math.round((count / total) * 100);
                const color = status === "completed" ? "bg-emerald-400" : status === "sent" || status === "partial" ? "bg-orange-400" : status === "draft" ? "bg-slate-400" : "bg-amber-400";
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-white/60 w-20 capitalize font-medium">{status}</span>
                    <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}/60 transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-16 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </InvGlassCard>
        )}
      </div>
    </div>
  );
}
