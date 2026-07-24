import { useState } from "react";
import { BarChart3, Users, TrendingUp, Clock, ShieldCheck, DollarSign, Briefcase, UserMinus, UserPlus } from "lucide-react";
import {
  useWorkforceSummary, useHeadcountTrend, useTurnoverStats,
  useTenureDistribution, useProbationStatus, useCostPerDepartment,
} from "../hooks/useHr";
import { InvGlassCard, InvSectionHeader, InvKpiCard } from "@/lib/inventory/InventoryComponents";

const TENURE_ORDER = ["< 6 bulan", "6-12 bulan", "1-2 tahun", "2-5 tahun", "5+ tahun"];
const TENURE_COLORS = ["bg-rose-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400", "bg-violet-400"];

export default function WorkforceAnalyticsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data: summary } = useWorkforceSummary();
  const { data: headcountTrend } = useHeadcountTrend(12);
  const { data: turnover } = useTurnoverStats(year);
  const { data: tenure } = useTenureDistribution();
  const { data: probation } = useProbationStatus();
  const { data: costByDept } = useCostPerDepartment();

  const maxCost = Math.max(...(costByDept || []).map((d: any) => Number(d.totalSalary) || 0), 1);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      <InvSectionHeader icon={BarChart3} title="Workforce Analytics" subtitle="Analitik SDM komprehensif" />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <InvKpiCard title="Aktif" value={summary?.totalActive || 0} icon={Users} color="bg-emerald-500/15 text-emerald-400" animate />
        <InvKpiCard title="Non-aktif" value={summary?.totalInactive || 0} icon={UserMinus} color="bg-rose-500/15 text-rose-400" animate />
        <InvKpiCard title="Kandidat" value={summary?.totalCandidate || 0} icon={UserPlus} color="bg-blue-500/15 text-blue-400" animate />
        <InvKpiCard title="Departemen" value={summary?.totalDepartments || 0} icon={Briefcase} color="bg-violet-500/15 text-violet-400" />
        <InvKpiCard title="Posisi" value={summary?.totalPositions || 0} icon={Briefcase} color="bg-cyan-500/15 text-cyan-400" />
        <InvKpiCard title="Turnover" value={`${turnover?.turnoverRate || 0}%`} icon={TrendingUp} color="bg-amber-500/15 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Headcount Trend */}
        <InvGlassCard>
          <InvSectionHeader icon={TrendingUp} title="Headcount Trend" subtitle="12 bulan terakhir" />
          <div className="mt-3 overflow-x-auto">
            {headcountTrend && headcountTrend.length > 0 ? (
              <div className="flex items-end gap-1 h-32 min-w-[300px]">
                {headcountTrend.map((h: any, i: number) => {
                  const max = Math.max(...headcountTrend.map((x: any) => x.count), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.month}: ${h.count} karyawan`}>
                      <span className="text-[8px] text-white/30">{h.count}</span>
                      <div className="w-full bg-blue-400/40 rounded-t" style={{ height: `${(h.count / max) * 100}%` }} />
                      <span className="text-[8px] text-white/20">{h.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-xs text-white/30 py-8 text-center">Belum ada data</div>}
          </div>
        </InvGlassCard>

        {/* Turnover */}
        <InvGlassCard>
          <InvSectionHeader icon={UserMinus} title="Turnover & Attrition" />
          <div className="mt-3 flex items-center justify-between mb-3">
            <select value={year} onChange={e => setYear(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {turnover && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-xl font-bold text-emerald-400">{turnover.hired}</div>
                <div className="text-[10px] text-white/40">Direkrut</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className="text-xl font-bold text-rose-400">{turnover.resigned}</div>
                <div className="text-[10px] text-white/40">Keluar</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="text-xl font-bold text-blue-400">{turnover.totalHeadcount}</div>
                <div className="text-[10px] text-white/40">Total Saat Ini</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="text-xl font-bold text-amber-400">{turnover.turnoverRate}%</div>
                <div className="text-[10px] text-white/40">Turnover Rate</div>
              </div>
            </div>
          )}
        </InvGlassCard>

        {/* Tenure Distribution */}
        <InvGlassCard>
          <InvSectionHeader icon={Clock} title="Distribusi Masa Kerja" />
          <div className="mt-3 space-y-2">
            {tenure && tenure.length > 0 ? tenure.map((t: any, i: number) => {
              const total = tenure.reduce((s: number, x: any) => s + x.count, 0);
              const pct = total ? Math.round((t.count / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-20 truncate">{t.tenure}</span>
                  <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${TENURE_COLORS[i] || "bg-white/20"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-white/30 w-12 text-right">{t.count} ({pct}%)</span>
                </div>
              );
            }) : <div className="text-xs text-white/30 py-4 text-center">Belum ada data</div>}
          </div>
        </InvGlassCard>

        {/* Probation */}
        <InvGlassCard>
          <InvSectionHeader icon={ShieldCheck} title="Status Probation" />
          {probation && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="text-xl font-bold text-amber-400">{probation.onProbation}</div>
                <div className="text-[10px] text-white/40">Masih Probation</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="text-xl font-bold text-orange-400">{probation.expiringSoon}</div>
                <div className="text-[10px] text-white/40">Habis 30 Hari</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-xl font-bold text-emerald-400">{probation.expired}</div>
                <div className="text-[10px] text-white/40">Selesai Probation</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xl font-bold text-white/50">{probation.noProbation}</div>
                <div className="text-[10px] text-white/40">Tanpa Info</div>
              </div>
            </div>
          )}
        </InvGlassCard>
      </div>

      {/* Cost per Department */}
      <InvGlassCard>
        <InvSectionHeader icon={DollarSign} title="Biaya Gaji per Departemen" subtitle={`${(costByDept || []).length} departemen`} />
        <div className="mt-3 space-y-2">
          {(costByDept || []).map((d: any, i: number) => {
            const cost = Number(d.totalSalary) || 0;
            const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-28 truncate">{d.departmentName || "Tanpa Dept"}</span>
                <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400/50" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-white/30 w-6 text-right">{d.employeeCount}</span>
                <span className="text-[10px] text-emerald-400/70 w-24 text-right">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(cost)}
                </span>
              </div>
            );
          })}
        </div>
      </InvGlassCard>
    </div>
  );
}
