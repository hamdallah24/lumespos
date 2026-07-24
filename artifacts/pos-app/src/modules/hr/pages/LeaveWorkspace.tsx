import { useState, useMemo } from "react";
import { CalendarOff, CheckCircle2, XCircle, Clock, FileText, BarChart3, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useLeaves, useLeaveCalendar, useLeaveBalance, useTeamLeave, useLeaveAnalytics, useEmployees, useTransitionLeave, useDepartments } from "../hooks/useHr";
import { useBranch } from "@/lib/branch";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState } from "@/lib/inventory/InventoryComponents";
import { Button } from "@/components/ui/button";
import type { LeaveRequest } from "../types";

type Tab = "queue" | "calendar" | "team" | "analytics";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Cuti Tahunan", sick: "Sakit", permission: "Izin",
  maternity: "Melahirkan", paternal: "Ayah", unpaid: "Tanpa Bayaran",
};
const LEAVE_COLORS: Record<string, string> = {
  annual: "bg-blue-500/20 text-blue-300", sick: "bg-rose-500/20 text-rose-300",
  permission: "bg-amber-500/20 text-amber-300", maternity: "bg-violet-500/20 text-violet-300",
  paternity: "bg-emerald-500/20 text-emerald-300", unpaid: "bg-white/10 text-white/50",
};
const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-white/10 text-white/40 border-white/10",
};

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function LeaveWorkspace() {
  const { branchId } = useBranch();
  const [tab, setTab] = useState<Tab>("queue");
  const [filter, setFilter] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<number | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const { data: allLeaves } = useLeaves();
  const calMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const { data: calendar } = useLeaveCalendar(calMonthStr);
  const { data: balance } = useLeaveBalance(selectedEmp);
  const { data: teamLeave } = useTeamLeave(undefined, calMonthStr);
  const { data: analytics } = useLeaveAnalytics(String(calYear));
  const { data: employees } = useEmployees(branchId);
  const { data: departments } = useDepartments(branchId);
  const transitionLeave = useTransitionLeave();

  const employeeMap = useMemo(() => {
    if (!employees) return new Map<number, string>();
    return new Map(employees.map((e: any) => [e.id, e.fullName]));
  }, [employees]);

  const deptMap = useMemo(() => {
    if (!departments) return new Map<number, string>();
    return new Map(departments.map((d: any) => [d.id, d.name]));
  }, [departments]);

  const counts = useMemo(() => {
    if (!allLeaves) return {} as Record<string, number>;
    const c: Record<string, number> = {};
    for (const l of allLeaves) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [allLeaves]);

  const filtered = useMemo(() => {
    if (!allLeaves) return [];
    if (!filter) return allLeaves;
    return allLeaves.filter(l => l.status === filter);
  }, [allLeaves, filter]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const cells: { day: number; entries: any[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entries = (calendar || []).filter((e: any) => e.startDate <= dateStr && e.endDate >= dateStr);
      cells.push({ day: d, entries });
    }
    return { firstDay, cells };
  }, [calYear, calMonth, daysInMonth, calendar]);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "queue", label: "Approval Queue", icon: Clock },
    { key: "calendar", label: "Kalender", icon: CalendarOff },
    { key: "team", label: "Tim", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      <InvSectionHeader icon={CalendarOff} title="Leave Management" subtitle={`${allLeaves?.length || 0} total pengajuan`} />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <InvKpiCard title="Menunggu" value={counts.submitted || 0} icon={Clock} color="bg-amber-500/15 text-amber-400" animate />
        <InvKpiCard title="Disetujui" value={counts.approved || 0} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-400" animate />
        <InvKpiCard title="Ditolak" value={counts.rejected || 0} icon={XCircle} color="bg-rose-500/15 text-rose-400" animate />
        <InvKpiCard title="Selesai" value={counts.completed || 0} icon={CalendarOff} color="bg-blue-500/15 text-blue-400" animate />
        <InvKpiCard title="Draft" value={counts.draft || 0} icon={FileText} color="bg-violet-500/15 text-violet-400" animate />
        <InvKpiCard title="Total Hari" value={analytics?.byType?.totalDays || 0} icon={BarChart3} color="bg-cyan-500/15 text-cyan-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-10 flex-shrink-0 ${
              tab === t.key ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60"
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* QUEUE TAB */}
      {tab === "queue" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["", "submitted", "approved", "rejected", "completed", "draft"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-10 ${
                  filter === s ? "bg-white/10 text-white" : "bg-white/[0.03] text-white/40 hover:text-white/60"
                }`}>
                {s || "Semua"} {s ? `(${counts[s] || 0})` : `(${allLeaves?.length || 0})`}
              </button>
            ))}
          </div>

          <InvGlassCard>
            <div className="space-y-2">
              {filtered.length > 0 ? filtered.map((l: LeaveRequest) => (
                <div key={l.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm flex-shrink-0">
                      {(l.employeeName || "#").charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white/80">{l.employeeName || `#${l.employeeId}`}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[l.status] || "text-white/30 border-white/10"}`}>{l.status}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${LEAVE_COLORS[l.leaveType] || "bg-white/10 text-white/50"}`}>{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{formatShort(l.startDate)} - {formatShort(l.endDate)} ({l.totalDays}h)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    {l.status === "submitted" && (
                      <>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => transitionLeave.mutate({ id: l.id, status: "approved" })}>Setujui</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-400 hover:text-rose-300"
                          onClick={() => transitionLeave.mutate({ id: l.id, status: "rejected" })}>Tolak</Button>
                      </>
                    )}
                    {l.reason && <span className="text-[10px] text-white/30 max-w-[120px] truncate" title={l.reason}>{l.reason}</span>}
                  </div>
                </div>
              )) : <InvEmptyState icon={CalendarOff} title="Tidak ada data" description={filter ? `Tidak ada cuti "${filter}"` : "Belum ada pengajuan cuti"} />}
            </div>
          </InvGlassCard>
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === "calendar" && (
        <div className="space-y-4">
          {/* Month Nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
              className="p-2 rounded-lg bg-white/[0.03] text-white/50 hover:text-white min-h-10 min-w-10"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-white/70">{new Date(calYear, calMonth).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
              className="p-2 rounded-lg bg-white/[0.03] text-white/50 hover:text-white min-h-10 min-w-10"><ChevronRight size={16} /></button>
          </div>

          <InvGlassCard>
            <div className="grid grid-cols-7 gap-0.5">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => (
                <div key={d} className="text-[10px] text-white/30 text-center py-1 font-medium">{d}</div>
              ))}
              {Array.from({ length: calendarGrid.firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {calendarGrid.cells.map(cell => (
                <div key={cell.day} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] gap-0.5 ${
                  cell.entries.length > 0 ? "bg-blue-500/10 border border-blue-500/15" : "bg-white/[0.02]"
                }`}>
                  <span className="text-white/50">{cell.day}</span>
                  {cell.entries.length > 0 && (
                    <div className="flex gap-0.5">
                      {cell.entries.slice(0, 3).map((e: any, i: number) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${
                          e.status === "approved" ? "bg-emerald-400" : "bg-amber-400"
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </InvGlassCard>

          {/* Legend + Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InvGlassCard>
              <InvSectionHeader icon={FileText} title="Legenda" />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-emerald-400" />Approved</span>
                <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-amber-400" />Submitted</span>
                <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-white/20" />Empty</span>
              </div>
            </InvGlassCard>

            {selectedEmp && balance && (
              <InvGlassCard>
                <InvSectionHeader icon={Clock} title="Saldo Cuti" subtitle={`Karyawan #${selectedEmp}`} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["annual", "sick", "permission"] as const).map(t => (
                    <div key={t} className="text-center">
                      <div className="text-lg font-bold text-white/70">{balance.remaining[t]}</div>
                      <div className="text-[10px] text-white/30">{t}</div>
                      <div className="text-[10px] text-white/20">sisa {balance.quota[t]}</div>
                    </div>
                  ))}
                </div>
              </InvGlassCard>
            )}
          </div>
        </div>
      )}

      {/* TEAM TAB */}
      {tab === "team" && (
        <InvGlassCard>
          <InvSectionHeader icon={Users} title="Cuti Tim" subtitle={`${(teamLeave as any[] || []).length} pengajuan aktif`} />
          <div className="mt-3 space-y-2">
            {(teamLeave as any[] || []).length > 0 ? (teamLeave as any[]).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[10px] text-white">
                    {(t.employeeName || "#").charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs text-white/70 block">{t.employeeName || `#${t.employeeId}`}</span>
                    <span className="text-[10px] text-white/30">{LEAVE_TYPE_LABELS[t.leaveType] || t.leaveType} · {formatShort(t.startDate)} - {formatShort(t.endDate)}</span>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[t.status]}`}>{t.status}</span>
              </div>
            )) : <InvEmptyState icon={Users} title="Tidak ada cuti tim" description="Tidak ada pengajuan cuti aktif di tim" />}
          </div>
        </InvGlassCard>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <InvKpiCard title="Total Pengajuan" value={analytics.byType.total} icon={FileText} color="bg-blue-500/15 text-blue-400" />
            <InvKpiCard title="Total Hari Cuti" value={analytics.byType.totalDays} icon={CalendarOff} color="bg-amber-500/15 text-amber-400" />
            <InvKpiCard title="Disetujui" value={analytics.byStatus.approved} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-400" />
            <InvKpiCard title="Ditolak" value={analytics.byStatus.rejected} icon={XCircle} color="bg-rose-500/15 text-rose-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Type */}
            <InvGlassCard>
              <InvSectionHeader icon={BarChart3} title="Berdasarkan Tipe" />
              <div className="mt-3 space-y-2">
                {(["annual", "sick", "permission", "maternity", "paternity", "unpaid"] as const).map(t => {
                  const val = analytics.byType[t] || 0;
                  const pct = analytics.byType.total ? Math.round((val / analytics.byType.total) * 100) : 0;
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-16 truncate">{LEAVE_TYPE_LABELS[t]}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400/50" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-6 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>

            {/* By Status */}
            <InvGlassCard>
              <InvSectionHeader icon={BarChart3} title="Berdasarkan Status" />
              <div className="mt-3 space-y-2">
                {(["submitted", "approved", "rejected", "cancelled", "completed"] as const).map(s => {
                  const val = analytics.byStatus[s] || 0;
                  const pct = analytics.byType.total ? Math.round((val / analytics.byType.total) * 100) : 0;
                  const color = s === "approved" ? "bg-emerald-400/50" : s === "rejected" ? "bg-rose-400/50" : s === "submitted" ? "bg-amber-400/50" : "bg-white/20";
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-16 capitalize">{s}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 w-6 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>
          </div>

          {/* Monthly Trend */}
          {analytics.monthly.length > 0 && (
            <InvGlassCard>
              <InvSectionHeader icon={BarChart3} title="Tren Bulanan" />
              <div className="mt-3 overflow-x-auto">
                <div className="flex items-end gap-1 h-28 min-w-[300px]">
                  {analytics.monthly.map((m: any) => {
                    const maxCount = Math.max(...analytics.monthly.map((x: any) => x.count), 1);
                    const heightPct = Math.round((m.count / maxCount) * 100);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: ${m.count} pengajuan, ${m.totalDays} hari`}>
                        <span className="text-[8px] text-white/30">{m.count}</span>
                        <div className="w-full bg-blue-400/40 rounded-t" style={{ height: `${heightPct}%` }} />
                        <span className="text-[8px] text-white/20">{m.month.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </InvGlassCard>
          )}
        </div>
      )}
    </div>
  );
}
