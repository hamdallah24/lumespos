import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, Clock, CalendarOff, Briefcase, ShieldCheck,
  Building2, ChevronRight, RefreshCw, TreePine, Clock4, AlertTriangle,
} from "lucide-react";
import {
  useEmployees, useDepartments, useHrDashboard, useHrValidation,
  useOrgTree, useHrEvents, useAttendanceSummary, useLeaves,
} from "../hooks/useHr";
import type { Employee } from "../types";
import { useBranch } from "@/lib/branch";
import { InvKpiCard, InvGlassCard, InvSectionHeader, InvEmptyState, InvLoadingSkeleton } from "@/lib/inventory/InventoryComponents";
import { Separator } from "@/components/ui/separator";

const eventIcon: Record<string, string> = {
  "employee.hired": "🎓", "employee.activated": "✅", "employee.suspended": "⚠️",
  "employee.resigned": "🚪", "employee.terminated": "⛔", "employee.archived": "📦",
  "attendance.check_in": "📥", "attendance.check_out": "📤", "leave.approved": "👍",
  "leave.rejected": "👎", "leave.submitted": "📋",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j`;
  return `${Math.floor(hrs / 24)}h`;
}

export default function HRWorkspace() {
  const { branchId } = useBranch();

  const { data: dashboard, isLoading: dashLoading } = useHrDashboard(branchId);
  const { data: employees } = useEmployees(branchId);
  const { data: departments } = useDepartments(branchId);
  const { data: validation } = useHrValidation(branchId);
  const { data: orgTree } = useOrgTree(branchId);
  const { data: hrEvents } = useHrEvents();
  const { data: attendanceSummary } = useAttendanceSummary();
  const { data: approvedLeaves } = useLeaves("approved");

  const onLeave = useMemo(() => approvedLeaves?.filter(l => l.status === "approved") || [], [approvedLeaves]);
  const activeCount = dashboard?.byStatus?.active || employees?.filter(e => e.status === "active").length || 0;
  const notCheckedIn = dashboard?.attendance ? dashboard.attendance.totalToday - dashboard.attendance.present - dashboard.attendance.onLeave : 0;
  const deptWithoutManager = departments?.filter(d => !d.headPositionId);
  const recommendations = [];
  if (notCheckedIn > 0) recommendations.push({ icon: "📥", title: `${notCheckedIn} karyawan belum check in`, severity: "medium" as const });
  if (dashboard?.pendingLeaves && dashboard.pendingLeaves > 0) recommendations.push({ icon: "📋", title: `${dashboard.pendingLeaves} permohonan cuti menunggu`, severity: "high" as const });
  if (validation?.failedChecks && validation.failedChecks > 0) recommendations.push({ icon: "⚠️", title: `${validation.failedChecks} temuan validasi`, severity: "high" as const });
  if (deptWithoutManager?.length) recommendations.push({ icon: "🏗️", title: `${deptWithoutManager.length} departemen tanpa kepala`, severity: "medium" as const });
  if (attendanceSummary?.late && attendanceSummary.late > 0) recommendations.push({ icon: "⏰", title: `${attendanceSummary.late} karyawan terlambat hari ini`, severity: "medium" as const });

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">HR Command Center</h1>
          <p className="text-xs text-white/40">Human Capital Intelligence Center</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/60">
            <Building2 className="w-3.5 h-3.5" />
            <span>Cabang {branchId || "Semua"}</span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <InvKpiCard title="Total Karyawan" value={dashboard?.totalEmployees ?? "-"} icon={Users} color="bg-blue-500/15 text-blue-400" animate />
        <InvKpiCard title="Aktif" value={activeCount || "-"} icon={UserCheck} color="bg-emerald-500/15 text-emerald-400" animate />
        <InvKpiCard title="Hadir Hari Ini" value={dashboard?.attendance.present ?? "-"} icon={Clock} color="bg-violet-500/15 text-violet-400" subtitle={`/${dashboard?.attendance.totalToday || 0}`} animate />
        <InvKpiCard title="Terlambat" value={attendanceSummary?.late ?? "-"} icon={AlertTriangle} color="bg-amber-500/15 text-amber-400" animate />
        <InvKpiCard title="Cuti Aktif" value={onLeave.length || "-"} icon={CalendarOff} color="bg-rose-500/15 text-rose-400" animate />
        <InvKpiCard title="Lembur" value={attendanceSummary?.overtimeToday ?? "-"} icon={Briefcase} color="bg-cyan-500/15 text-cyan-400" animate />
        <InvKpiCard title="Pending" value={dashboard?.pendingLeaves ?? "-"} icon={Clock4} color="bg-orange-500/15 text-orange-400" animate />
        <InvKpiCard title="Validasi" value={dashboard?.validationLabel || "-"} icon={ShieldCheck} color={
          (dashboard?.validationScore || 0) >= 80 ? "bg-emerald-500/15 text-emerald-400" :
          (dashboard?.validationScore || 0) >= 50 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"
        } subtitle={`${dashboard?.validationScore || 0}%`} animate />
      </div>

      {/* AI RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
          {recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                r.severity === "high" ? "bg-rose-500/10 text-rose-300" :
                r.severity === "medium" ? "bg-amber-500/10 text-amber-300" : "bg-blue-500/10 text-blue-300"
              }`}
            >
              <span className="text-base">{r.icon}</span>
              <span>{r.title}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ORG DIGITAL TWIN + TIMELINE + VALIDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ORG TREE */}
        <InvGlassCard>
          <InvSectionHeader icon={TreePine} title="Organisasi" subtitle="Struktur perusahaan" />
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
            {orgTree && orgTree.length > 0 ? orgTree.slice(0, 15).map(node => (
              <OrgNodeItem key={node.id} node={node} depth={0} />
            )) : dashLoading ? <InvLoadingSkeleton rows={4} cols={1} /> : <InvEmptyState icon={TreePine} title="Kosong" />}
          </div>
        </InvGlassCard>

        {/* TIMELINE */}
        <InvGlassCard>
          <InvSectionHeader icon={Clock4} title="Aktivitas Terkini" subtitle="24 jam terakhir" />
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
            {hrEvents && hrEvents.length > 0 ? hrEvents.slice(0, 20).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-1.5 border-l-2 border-white/5 pl-3 hover:border-white/20 transition-colors">
                <span className="text-sm">{eventIcon[ev.eventType] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 truncate">{ev.eventType.replace(/\./g, " ")}</div>
                  <div className="text-[10px] text-white/30">{timeAgo(ev.createdAt)}</div>
                </div>
              </div>
            )) : <InvEmptyState icon={Clock4} title="Belum ada aktivitas" />}
          </div>
        </InvGlassCard>

        {/* VALIDATION */}
        <InvGlassCard>
          <InvSectionHeader icon={ShieldCheck} title="Kesehatan Organisasi" subtitle={validation?.overallLabel || "..."} />
          <div className="mt-3 space-y-1.5">
            <div className="text-2xl font-bold mb-1 text-white/80">{validation?.overallScore || 0}%</div>
            {validation?.checks.slice(0, 8).map(c => (
              <div key={c.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    c.status === "passed" ? "bg-emerald-400" :
                    c.status === "info" ? "bg-blue-400" :
                    c.status === "warning" ? "bg-amber-400" : "bg-rose-400"
                  }`} />
                  <span className="text-[11px] text-white/60 truncate">{c.name}</span>
                </div>
                {c.count !== undefined && <span className="text-[10px] text-white/30">{c.count}</span>}
              </div>
            ))}
          </div>
        </InvGlassCard>
      </div>

      {/* ATTENDANCE SUMMARY */}
      <InvGlassCard>
        <InvSectionHeader icon={Clock} title="Ringkasan Absensi Hari Ini" />
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: "Hadir", value: attendanceSummary?.present ?? 0, color: "text-emerald-400" },
            { label: "Terlambat", value: attendanceSummary?.late ?? 0, color: "text-amber-400" },
            { label: "Cuti", value: attendanceSummary?.onLeave ?? 0, color: "text-blue-400" },
            { label: "Lembur", value: attendanceSummary?.overtimeToday ?? 0, color: "text-violet-400" },
            { label: "Total", value: attendanceSummary?.totalToday ?? 0, color: "text-white" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-lg font-bold text-white">{s.value}</span>
              <span className="text-[10px] text-white/40 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </InvGlassCard>
    </div>
  );
}

function OrgNodeItem({ node, depth }: { node: any; depth: number }) {
  if (node.type === "employee") {
    return (
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[9px] text-white font-medium shrink-0">
          {(node.name || "?").charAt(0)}
        </div>
        <span className="text-xs text-white/60 truncate">{node.name}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 16}px` }}>
        <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-medium text-white/80">{node.name}</span>
      </div>
      {node.children?.map((child: any) => <OrgNodeItem key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}
