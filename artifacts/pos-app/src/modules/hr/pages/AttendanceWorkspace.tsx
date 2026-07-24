import { useState, useMemo } from "react";
import { Clock, Users, CheckCircle, XCircle, AlertTriangle, Clock4, TimerOff, History, BarChart3, AlertCircle, UserX } from "lucide-react";
import { useAttendanceSummary, useAttendanceToday, useAttendanceMissingCheckout, useAttendanceOvertimeActive, useAttendanceHistory, useAttendanceAnalytics, useEmployees, useAttendanceCorrect } from "../hooks/useHr";
import { useBranch } from "@/lib/branch";
import { InvGlassCard, InvSectionHeader, InvKpiCard, InvEmptyState } from "@/lib/inventory/InventoryComponents";
import type { AttendanceRecord } from "../types";

type Tab = "live" | "history" | "analytics";

export default function AttendanceWorkspace() {
  const { branchId } = useBranch();
  const [tab, setTab] = useState<Tab>("live");

  const { data: summary } = useAttendanceSummary();
  const { data: today } = useAttendanceToday();
  const { data: missingCheckout } = useAttendanceMissingCheckout();
  const { data: overtimeActive } = useAttendanceOvertimeActive();
  const { data: employees } = useEmployees(branchId);

  const [histPage, setHistPage] = useState(1);
  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");
  const [histStatus, setHistStatus] = useState("");
  const { data: history } = useAttendanceHistory({
    from: histFrom || undefined, to: histTo || undefined,
    status: histStatus || undefined, page: histPage, limit: 20,
  });

  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const { data: analytics } = useAttendanceAnalytics({
    from: analyticsFrom || undefined, to: analyticsTo || undefined,
  });

  const correctMutation = useAttendanceCorrect();

  const employeeMap = useMemo(() => {
    if (!employees) return new Map<number, string>();
    return new Map(employees.map((e: any) => [e.id, e.fullName]));
  }, [employees]);

  const present = today?.filter((a: AttendanceRecord) => a.checkIn && !a.lateMinutes) || [];
  const late = today?.filter((a: AttendanceRecord) => a.lateMinutes && a.lateMinutes > 0) || [];
  const absent = summary ? Math.max(0, summary.totalToday - (present.length + late.length + (summary?.onLeave || 0))) : 0;
  const attendRate = summary?.totalToday ? Math.round(((present.length + late.length) / summary.totalToday) * 100) : 0;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "live", label: "Live Board", icon: Clock },
    { key: "history", label: "Riwayat", icon: History },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      <InvSectionHeader icon={Clock} title="Attendance Center" subtitle={`${summary?.totalToday || 0} karyawan hari ini`} />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <InvKpiCard title="Hadir" value={present.length} icon={CheckCircle} color="bg-emerald-500/15 text-emerald-400" animate />
        <InvKpiCard title="Terlambat" value={late.length} icon={AlertTriangle} color="bg-amber-500/15 text-amber-400" animate />
        <InvKpiCard title="Absen" value={absent} icon={XCircle} color="bg-rose-500/15 text-rose-400" animate />
        <InvKpiCard title="Cuti" value={summary?.onLeave ?? 0} icon={TimerOff} color="bg-blue-500/15 text-blue-400" animate />
        <InvKpiCard title="Lembur" value={summary?.overtimeToday ?? 0} icon={Clock4} color="bg-violet-500/15 text-violet-400" animate />
        <InvKpiCard title="Kehadiran" value={`${attendRate}%`} icon={Users} color={attendRate >= 80 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"} animate />
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

      {/* LIVE TAB */}
      {tab === "live" && (
        <div className="space-y-4">
          {/* Alerts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Missing Checkout */}
            <InvGlassCard>
              <InvSectionHeader icon={AlertCircle} title="Belum Check-Out" subtitle={`${(missingCheckout as any[] || []).length} karyawan`} />
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {(missingCheckout as any[] || []).length > 0 ? (missingCheckout as any[]).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[9px] text-white font-medium">
                        {(m.employeeName || "#").charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs text-white/70 block">{m.employeeName || `#${m.employeeId}`}</span>
                        <span className="text-[10px] text-white/30">In: {m.checkIn ? new Date(m.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-xs text-white/30 py-4 text-center">Semua sudah check-out</div>}
              </div>
            </InvGlassCard>

            {/* Overtime Active */}
            <InvGlassCard>
              <InvSectionHeader icon={Clock4} title="Lembur Aktif" subtitle={`${(overtimeActive as any[] || []).length} karyawan`} />
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {(overtimeActive as any[] || []).length > 0 ? (overtimeActive as any[]).map((o: any) => {
                  const started = o.overtimeStart ? new Date(o.overtimeStart) : null;
                  const elapsedMin = started ? Math.round((Date.now() - started.getTime()) / 60000) : 0;
                  return (
                    <div key={o.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-[9px] text-white font-medium">
                          {(o.employeeName || "#").charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs text-white/70 block">{o.employeeName || `#${o.employeeId}`}</span>
                          <span className="text-[10px] text-white/30">Mulai: {started?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-violet-400 font-medium">{elapsedMin}m</span>
                    </div>
                  );
                }) : <div className="text-xs text-white/30 py-4 text-center">Tidak ada lembur aktif</div>}
              </div>
            </InvGlassCard>
          </div>

          {/* Today's List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvGlassCard>
              <InvSectionHeader icon={CheckCircle} title="Tepat Waktu" subtitle={`${present.length} karyawan`} />
              <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
                {present.length > 0 ? present.slice(0, 30).map((a: AttendanceRecord) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[9px] text-white font-medium">
                        {(employeeMap.get(a.employeeId) || `#${a.employeeId}`).charAt(0)}
                      </div>
                      <span className="text-xs text-white/70">{employeeMap.get(a.employeeId) || `Karyawan #${a.employeeId}`}</span>
                    </div>
                    <span className="text-[10px] text-emerald-300">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                  </div>
                )) : <div className="text-xs text-white/30 py-4 text-center">Belum ada data</div>}
              </div>
            </InvGlassCard>

            <InvGlassCard>
              <InvSectionHeader icon={AlertTriangle} title="Terlambat" subtitle={`${late.length} karyawan`} />
              <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
                {late.length > 0 ? late.slice(0, 30).map((a: AttendanceRecord) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[9px] text-white font-medium">
                        {(employeeMap.get(a.employeeId) || `#${a.employeeId}`).charAt(0)}
                      </div>
                      <span className="text-xs text-white/70">{employeeMap.get(a.employeeId) || `Karyawan #${a.employeeId}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                      <span className="text-[10px] text-amber-400 font-medium">+{a.lateMinutes}m</span>
                    </div>
                  </div>
                )) : <div className="text-xs text-white/30 py-4 text-center">Semua tepat waktu</div>}
              </div>
            </InvGlassCard>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <InvGlassCard>
          <InvSectionHeader icon={History} title="Riwayat Absensi" subtitle={`${(history as any)?.total || 0} catatan`} />

          <div className="mt-3 flex flex-wrap gap-2">
            <input type="date" value={histFrom} onChange={e => { setHistFrom(e.target.value); setHistPage(1); }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <input type="date" value={histTo} onChange={e => { setHistTo(e.target.value); setHistPage(1); }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <select value={histStatus} onChange={e => { setHistStatus(e.target.value); setHistPage(1); }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10">
              <option value="">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="absent">Absen</option>
              <option value="leave">Cuti</option>
              <option value="half_day">Setengah Hari</option>
            </select>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.05]">
                  <th className="text-left py-2 px-2 font-medium">Tanggal</th>
                  <th className="text-left py-2 px-2 font-medium">Karyawan</th>
                  <th className="text-left py-2 px-2 font-medium">Check In</th>
                  <th className="text-left py-2 px-2 font-medium">Check Out</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-2 font-medium">Telat</th>
                  <th className="text-right py-2 px-2 font-medium">Lembur</th>
                </tr>
              </thead>
              <tbody>
                {((history as any)?.data || []).map((r: any) => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-white/60">{r.date}</td>
                    <td className="py-2 px-2 text-white/70">{r.employeeName || `#${r.employeeId}`}</td>
                    <td className="py-2 px-2 text-white/60">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                    <td className="py-2 px-2 text-white/60">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.status === "present" ? "bg-emerald-500/15 text-emerald-400" :
                        r.status === "late" ? "bg-amber-500/15 text-amber-400" :
                        r.status === "leave" ? "bg-blue-500/15 text-blue-400" :
                        r.status === "absent" ? "bg-rose-500/15 text-rose-400" :
                        "bg-white/5 text-white/50"
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-amber-400">{r.lateMinutes ? `${r.lateMinutes}m` : "-"}</td>
                    <td className="py-2 px-2 text-right text-violet-400">{r.overtimeMinutes ? `${r.overtimeMinutes}m` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(history as any)?.pages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] text-white/50 text-xs min-h-10 disabled:opacity-30">Prev</button>
              <span className="text-xs text-white/30">{(history as any).page} / {(history as any).pages}</span>
              <button onClick={() => setHistPage(p => p + 1)} disabled={histPage >= (history as any).pages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] text-white/50 text-xs min-h-10 disabled:opacity-30">Next</button>
            </div>
          )}
        </InvGlassCard>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input type="date" value={analyticsFrom} onChange={e => setAnalyticsFrom(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
            <input type="date" value={analyticsTo} onChange={e => setAnalyticsTo(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 min-h-10" />
          </div>

          {analytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InvKpiCard title="Total Record" value={analytics.statusBreakdown.total} icon={BarChart3} color="bg-blue-500/15 text-blue-400" />
                <InvKpiCard title="Rata-rata Telat" value={`${analytics.punctuality.avgLateMinutes}m`} icon={AlertTriangle} color="bg-amber-500/15 text-amber-400" />
                <InvKpiCard title="Max Telat" value={`${analytics.punctuality.maxLateMinutes}m`} icon={UserX} color="bg-rose-500/15 text-rose-400" />
                <InvKpiCard title="Lembur Total" value={`${Math.round(analytics.overtimeStats.totalOvertimeMinutes / 60)}h`} icon={Clock4} color="bg-violet-500/15 text-violet-400" />
              </div>

              {/* Status Breakdown */}
              <InvGlassCard>
                <InvSectionHeader icon={BarChart3} title="Status Breakdown" />
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Hadir", value: analytics.statusBreakdown.present, color: "emerald" },
                    { label: "Terlambat", value: analytics.statusBreakdown.late, color: "amber" },
                    { label: "Absen", value: analytics.statusBreakdown.absent, color: "rose" },
                    { label: "Cuti", value: analytics.statusBreakdown.leave, color: "blue" },
                    { label: "Setengah Hari", value: analytics.statusBreakdown.halfDay, color: "slate" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-3 bg-${s.color}-500/10 border border-${s.color}-500/10`}>
                      <div className={`text-lg font-bold text-${s.color}-400`}>{s.value}</div>
                      <div className="text-[10px] text-white/40">{s.label}</div>
                    </div>
                  ))}
                </div>
              </InvGlassCard>

              {/* Daily Chart */}
              {analytics.daily.length > 0 && (
                <InvGlassCard>
                  <InvSectionHeader icon={BarChart3} title="Tren Harian" subtitle={`${analytics.daily.length} hari`} />
                  <div className="mt-3 overflow-x-auto">
                    <div className="flex items-end gap-1 h-32 min-w-[400px]">
                      {analytics.daily.map((d: any, i: number) => {
                        const maxVal = Math.max(...analytics.daily.map((x: any) => x.present + x.late + x.absent + x.leave), 1);
                        const total = d.present + d.late + d.absent + d.leave;
                        const heightPct = Math.round((total / maxVal) * 100);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.present} hadir, ${d.late} telat, ${d.absent} absen, ${d.leave} cuti`}>
                            <div className="w-full flex flex-col rounded-t" style={{ height: `${heightPct}%` }}>
                              <div className="bg-emerald-400/60 rounded-t" style={{ height: `${d.present / total * 100}%` }} />
                              <div className="bg-amber-400/60" style={{ height: `${d.late / total * 100}%` }} />
                              <div className="bg-blue-400/40" style={{ height: `${d.leave / total * 100}%` }} />
                              <div className="bg-rose-400/40 rounded-b" style={{ height: `${d.absent / total * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-2 justify-center">
                      <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-emerald-400/60" />Hadir</span>
                      <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-amber-400/60" />Telat</span>
                      <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-blue-400/40" />Cuti</span>
                      <span className="flex items-center gap-1 text-[10px] text-white/40"><span className="w-2 h-2 rounded-full bg-rose-400/40" />Absen</span>
                    </div>
                  </div>
                </InvGlassCard>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
