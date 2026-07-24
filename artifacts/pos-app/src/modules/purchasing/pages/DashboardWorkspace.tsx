import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, AlertTriangle, CheckCircle, Truck, Clock, DollarSign,
  ShieldCheck, TrendingUp, TrendingDown, Activity, RefreshCw,
} from "lucide-react";
import { usePurchasingDashboard, usePurchasingValidation, useProcurementAI } from "@/modules/purchasing/hooks/usePurchasing";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvLoadingSkeleton, InvEmptyState, InvDrawer } from "@/lib/inventory/InventoryComponents";
import { formatRp } from "@/lib/format";

const severityConfig: Record<string, { color: string; bg: string; icon: any }> = {
  critical: { color: "text-rose-400", bg: "bg-rose-500/[0.06] border border-rose-500/20", icon: AlertTriangle },
  warning: { color: "text-amber-400", bg: "bg-amber-500/[0.06] border border-amber-500/20", icon: AlertTriangle },
  info: { color: "text-blue-400", bg: "bg-blue-500/[0.06] border border-blue-500/20", icon: Activity },
};

export default function DashboardWorkspace() {
  const { data: dashboard, isLoading } = usePurchasingDashboard();
  const { data: validation } = usePurchasingValidation();
  const { data: aiSuggestions } = useProcurementAI();
  const [selectedSP, setSelectedSP] = useState<any>(null);

  if (isLoading) return (
    <div className="h-full w-full bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center"><RefreshCw className="w-6 h-6 text-orange-400/50 mx-auto animate-spin mb-2" /><p className="text-xs text-white/30">Loading dashboard...</p></div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
        <InvSectionHeader icon={LayoutDashboard} title="Purchasing Dashboard" subtitle="Overview procurement & purchasing" />

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <InvKpiCard title="PO Aktif" value={String(dashboard?.openPOs ?? 0)} icon={Truck} color="bg-orange-500/15 text-orange-400" />
          <InvKpiCard title="Menunggu GR" value={String(dashboard?.goodsWaitingReceipt ?? 0)} icon={Clock} color="bg-amber-500/15 text-amber-400" />
          <InvKpiCard title="Invoice Outstanding" value={String(dashboard?.outstandingInvoices ?? 0)} icon={DollarSign} color="bg-blue-500/15 text-blue-400" />
          <InvKpiCard title="AP Pending" value={String(dashboard?.apPendingPayment ?? 0)} icon={DollarSign} color="bg-violet-500/15 text-violet-400" />
          <InvKpiCard title="Nilai Procurement" value={formatRp(dashboard?.procurementValue ?? 0)} icon={DollarSign} color="bg-emerald-500/15 text-emerald-400" />
          <InvKpiCard title="Validasi" value={`${dashboard?.validationScore ?? 0}%`} icon={ShieldCheck} color={(dashboard?.validationScore ?? 0) >= 80 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"} subtitle={dashboard?.validationLabel || ""} />
        </div>

        {/* AI Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(aiSuggestions || []).slice(0, 6).map((s: any, i: number) => {
            const cfg = severityConfig[s.severity] || severityConfig.info;
            const Icon = cfg.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl p-3 ${cfg.bg}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div>
                    <p className="text-[11px] font-semibold text-white">{s.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {(!aiSuggestions || aiSuggestions.length === 0) && (
            <InvEmptyState icon={Sparkles} text="Tidak ada insight saat ini" />
          )}
        </div>

        {/* Validation + Supplier Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Purchasing Validation</h3>
            </div>
            <div className="space-y-1.5">
              {validation?.checks?.map((c: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${c.status === "passed" ? "bg-emerald-500/[0.04] border border-emerald-500/10" : c.status === "failed" ? "bg-rose-500/[0.04] border border-rose-500/10" : "bg-white/[0.02] border border-white/5"}`}>
                  {c.status === "passed" ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-white/60">{c.name}</span>
                    <span className="text-[9px] text-white/20 ml-2">{c.detail}</span>
                  </div>
                </div>
              ))}
              {(!validation?.checks || validation.checks.length === 0) && (
                <p className="text-[10px] text-white/20 text-center py-4">No validation data</p>
              )}
            </div>
          </InvGlassCard>

          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-white">Supplier Performance</h3>
            </div>
            <div className="space-y-1.5">
              {(dashboard?.supplierPerformance || []).map((sp: any) => (
                <button key={sp.supplierId} onClick={() => setSelectedSP(selectedSP?.supplierId === sp.supplierId ? null : sp)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors ${selectedSP?.supplierId === sp.supplierId ? "bg-orange-500/[0.04] border border-orange-500/10" : "border border-transparent"}`}>
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] text-white/70 truncate">{sp.supplierName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-orange-400">{sp.poCount} PO</span>
                      <span className="text-[9px] text-emerald-400">{sp.receiptCount} GR</span>
                    </div>
                  </div>
                </button>
              ))}
              {(!dashboard?.supplierPerformance || dashboard.supplierPerformance.length === 0) && (
                <p className="text-[10px] text-white/20 text-center py-4">No supplier data</p>
              )}
            </div>
          </InvGlassCard>
        </div>
      </div>

      {/* Supplier Detail Drawer */}
      <AnimatePresence>
        {selectedSP && (
          <InvDrawer open={!!selectedSP} onClose={() => setSelectedSP(null)} title={selectedSP.supplierName || "Supplier Detail"}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Total PO</p>
                  <p className="text-base font-bold text-orange-400 mt-0.5">{selectedSP.poCount}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Total GR</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{selectedSP.receiptCount}</p>
                </div>
              </div>
            </div>
          </InvDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sparkles(props: any) { return <Activity {...props} />; }
