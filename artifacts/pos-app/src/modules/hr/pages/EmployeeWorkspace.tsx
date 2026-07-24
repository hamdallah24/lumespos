import React, { useState, useCallback } from "react";
import {
  useEmployeeExplorer, useEmployeeExplorerStats, useEmployeeProfile,
  useEmployeeAISuggestions, useUpdateEmployeeProfile, useChangeEmployeeStatus,
  useUpsertEmployeeDocument, useUpsertEmployeeAssignment, useDeleteEmployeeAssignment,
} from "../hooks/useHr";
import { InvLoadingSkeleton, InvGlassCard, InvKpiCard } from "@/lib/inventory/InventoryComponents";
import type { Employee, EmployeeProfile, EmployeeAISuggestion } from "../types";

const STATUS_COLORS: Record<string, string> = {
  candidate: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  hired: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  probation: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  suspended: "bg-red-500/15 text-red-300 border-red-500/20",
  resigned: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  terminated: "bg-red-500/15 text-red-300 border-red-500/20",
  archived: "bg-white/5 text-white/30 border-white/10",
};

const LEVEL_COLORS: Record<string, string> = {
  executive: "bg-amber-500/20 text-amber-300",
  director: "bg-purple-500/20 text-purple-300",
  manager: "bg-blue-500/20 text-blue-300",
  supervisor: "bg-emerald-500/20 text-emerald-300",
  staff: "bg-slate-500/20 text-slate-300",
  operator: "bg-cyan-500/20 text-cyan-300",
  intern: "bg-pink-500/20 text-pink-300",
};

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "freelance"];
const EMPLOYMENT_LABELS: Record<string, string> = { full_time: "Full Time", part_time: "Part Time", contract: "Contract", intern: "Intern", freelance: "Freelance" };
const STATUSES = ["candidate", "hired", "probation", "active", "suspended", "resigned", "terminated", "archived"];
const DOC_TYPES = ["KTP", "NPWP", "SIM", "Contract", "Certificate", "Medical", "Other"];
const ASSIGNMENT_TYPES = ["warehouse", "branch", "department", "position", "supervisor", "cost_center", "shift_group"];
const ASSIGNMENT_LABELS: Record<string, string> = { warehouse: "Gudang", branch: "Cabang", department: "Departemen", position: "Posisi", supervisor: "Supervisor", cost_center: "Cost Center", shift_group: "Shift Group" };

const EVENT_ICONS: Record<string, string> = {
  "employee.hired": "🎉", "employee.probation_started": "⏳", "employee.activated": "✅",
  "employee.suspended": "⏸️", "employee.resigned": "👋", "employee.terminated": "🚫",
  "employee.archived": "📦", "employee.updated": "✏️",
};

export default function EmployeeWorkspace() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<"explorer" | "profile">("explorer");
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterDept, setFilterDept] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEmpType, setFilterEmpType] = useState<string>("");
  const [page, setPage] = useState(1);

  const filters = { search, branchId: filterBranch || undefined, departmentId: filterDept || undefined, status: filterStatus || undefined, employmentType: filterEmpType || undefined, page };
  const { data: explorer, isLoading } = useEmployeeExplorer(filters);
  const { data: stats } = useEmployeeExplorerStats();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile(selectedId);
  const { data: aiSuggestions } = useEmployeeAISuggestions();
  const updateProfile = useUpdateEmployeeProfile();
  const changeStatus = useChangeEmployeeStatus();

  const handleSelect = useCallback((id: number) => { setSelectedId(id); setView("profile"); }, []);
  const handleBack = useCallback(() => { setSelectedId(null); setView("explorer"); }, []);

  if (view === "profile" && selectedId) {
    return <ProfileView profile={profile} loading={profileLoading} onBack={handleBack}
      updateProfile={updateProfile} changeStatus={changeStatus} />;
  }

  return (
    <div className="h-full bg-[#0a0e1a] text-white overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Employee Engine</h1>
            <p className="text-xs text-white/40 mt-1">Enterprise Identity — {explorer?.total || 0} karyawan</p>
          </div>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <InvKpiCard label="Total" value={String(stats.total)} icon="👥" />
            {stats.byStatus.slice(0, 5).map(s => (
              <InvKpiCard key={s.status} label={s.status} value={String(s.count)} icon={s.status === "active" ? "✅" : "📋"} />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Search name, code, phone..."
            className="flex-1 min-w-[200px] px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:border-blue-500/50 focus:outline-none" />
          <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
            <option value="">Semua Cabang</option>
          </select>
          <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
            <option value="">Semua Dept</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
            <option value="">Semua Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterEmpType} onChange={e => { setFilterEmpType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10">
            <option value="">Semua Tipe</option>
            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{EMPLOYMENT_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? <InvLoadingSkeleton /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {explorer?.data.map(emp => (
              <div key={emp.id} onClick={() => handleSelect(emp.id)}
                className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-white/70 shrink-0">
                    {emp.photoUrl ? <img src={emp.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" /> : emp.fullName?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{emp.fullName}</div>
                    <div className="text-[10px] text-white/40">{emp.employeeCode} • {emp.positionTitle || "No Position"}</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[emp.status] || "bg-white/5 text-white/30 border-white/10"}`}>
                    {emp.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-white/30">
                  <span>{emp.departmentName || "—"}</span>
                  {emp.positionLevel && <span className={`px-1.5 py-0.5 rounded ${LEVEL_COLORS[emp.positionLevel] || "bg-white/5 text-white/30"}`}>{emp.positionLevel}</span>}
                  <span className="ml-auto">{EMPLOYMENT_LABELS[emp.employmentType] || emp.employmentType}</span>
                </div>
              </div>
            ))}
            {explorer?.data.length === 0 && (
              <div className="col-span-full text-center py-16 text-white/20 text-sm">Tidak ada karyawan ditemukan</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {explorer && explorer.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-2.5 text-xs bg-white/5 rounded-lg disabled:opacity-30 min-h-10">← Prev</button>
            <span className="text-xs text-white/40">{page} / {explorer.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(explorer.totalPages, p + 1))} disabled={page >= explorer.totalPages}
              className="px-3 py-2.5 text-xs bg-white/5 rounded-lg disabled:opacity-30 min-h-10">Next →</button>
          </div>
        )}

        {/* AI Suggestions */}
        {aiSuggestions && aiSuggestions.length > 0 && (
          <InvGlassCard>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🤖</span>
              <h3 className="text-xs font-bold text-white/70">AI EMPLOYEE OFFICER</h3>
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded-full">{aiSuggestions.length}</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {aiSuggestions.slice(0, 10).map((s, i) => (
                <div key={i} onClick={() => s.employeeId && handleSelect(s.employeeId)}
                  className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg cursor-pointer hover:bg-white/[0.04] transition-all">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.severity === "critical" ? "bg-red-400" : s.severity === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-white/60">{s.title}</span>
                    <span className="text-[10px] text-white/30 ml-2">{s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </InvGlassCard>
        )}
      </div>
    </div>
  );
}

// ── Profile View ──
function ProfileView({ profile, loading, onBack, updateProfile, changeStatus }: {
  profile: EmployeeProfile | undefined; loading: boolean; onBack: () => void;
  updateProfile: any; changeStatus: any;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "employment" | "documents" | "assignments" | "timeline">("overview");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const upsertDoc = useUpsertEmployeeDocument();
  const upsertAssignment = useUpsertEmployeeAssignment();
  const deleteAssignment = useDeleteEmployeeAssignment();

  if (loading) return <div className="p-6"><InvLoadingSkeleton /></div>;
  if (!profile) return <div className="p-6 text-white/30 text-sm">Karyawan tidak ditemukan</div>;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "👤" },
    { id: "employment" as const, label: "Employment", icon: "💼" },
    { id: "documents" as const, label: "Documents", icon: "📄" },
    { id: "assignments" as const, label: "Assignments", icon: "🔗" },
    { id: "timeline" as const, label: "Timeline", icon: "📜" },
  ];

  const missingDocs = profile.documents.filter(d => d.status === "missing");
  const docsComplete = profile.documents.length >= 3 && missingDocs.length === 0;

  const handleSave = async () => {
    await updateProfile.mutateAsync({ id: profile.id, data: editData });
    setEditMode(false);
    setEditData({});
  };

  const handleStatusChange = async (newStatus: string) => {
    if (confirm(`Ubah status ke "${newStatus}"?`)) {
      await changeStatus.mutateAsync({ id: profile.id, status: newStatus });
    }
  };

  return (
    <div className="h-full bg-[#0a0e1a] text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0e1a]/90 backdrop-blur-lg border-b border-white/5 px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="text-white/40 hover:text-white text-xs">← Back</button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-white/70">
            {profile.photoUrl ? <img src={profile.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" /> : profile.fullName?.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{profile.fullName}</div>
            <div className="text-[10px] text-white/40">{profile.employeeCode} • {profile.positionTitle || "No Position"}</div>
          </div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[profile.status] || ""}`}>{profile.status}</span>
        <select value={profile.status} onChange={e => handleStatusChange(e.target.value)}
          className="px-2 py-2 bg-white/5 border border-white/10 rounded text-[10px] text-white focus:outline-none min-h-10">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Header Card */}
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-2xl font-bold text-white/50 shrink-0">
            {profile.photoUrl ? <img src={profile.photoUrl} className="w-20 h-20 rounded-2xl object-cover" alt="" /> : profile.fullName?.charAt(0)}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              {profile.positionLevel && <span className={`text-[10px] px-2 py-0.5 rounded-full ${LEVEL_COLORS[profile.positionLevel] || ""}`}>{profile.positionLevel}</span>}
              <span className="text-xs text-white/40">{EMPLOYMENT_LABELS[profile.employmentType] || profile.employmentType}</span>
              {profile.positionGrade && <span className="text-xs text-white/30">Grade {profile.positionGrade}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div><span className="text-white/30">Department:</span> <span className="text-white/70">{profile.departmentName || "—"}</span></div>
              <div><span className="text-white/30">Branch:</span> <span className="text-white/70">{profile.branchName || "—"}</span></div>
              <div><span className="text-white/30">Manager:</span> <span className="text-white/70">{profile.managerName || "—"}</span></div>
              <div><span className="text-white/30">Hire Date:</span> <span className="text-white/70">{profile.hireDate}</span></div>
            </div>
            {profile.posUser && (
              <div className="text-[10px] text-white/30">
                🔗 POS Account: <span className="text-blue-300">{profile.posUser.name}</span> ({profile.posUser.role}) — {profile.posUser.email}
              </div>
            )}
            {!profile.posUser && (
              <div className="text-[10px] text-red-300">⚠️ No POS account linked — identity integration incomplete</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2.5 text-xs rounded-t-lg transition-all whitespace-nowrap min-h-10 ${activeTab === t.id ? "bg-white/5 text-white font-medium" : "text-white/30 hover:text-white/50"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Basic Info" items={[
              { label: "Full Name", value: profile.fullName },
              { label: "Employee Code", value: profile.employeeCode },
              { label: "Phone", value: profile.phone || "—" },
              { label: "Address", value: profile.address || "—" },
              { label: "National ID", value: profile.idNumber ? `${profile.nationalIdType}: ${profile.idNumber}` : "—" },
            ]} />
            <InfoCard title="Bank & Tax" items={[
              { label: "Bank", value: profile.bankName || "—" },
              { label: "Account", value: profile.bankAccount || "—" },
              { label: "Tax ID (NPWP)", value: profile.taxId || "—" },
              { label: "Base Salary", value: profile.baseSalary !== "0" ? `Rp ${Number(profile.baseSalary).toLocaleString()}` : "—" },
            ]} />
            <InfoCard title="Emergency Contact" items={[
              { label: "Name", value: profile.emergencyContactName || "—" },
              { label: "Phone", value: profile.emergencyContactPhone || "—" },
            ]} />
            <InfoCard title="Status" items={[
              { label: "Status", value: profile.status },
              { label: "Employment Type", value: EMPLOYMENT_LABELS[profile.employmentType] || profile.employmentType },
              { label: "Hire Date", value: profile.hireDate },
              { label: "Probation End", value: profile.probationEndDate || "—" },
              { label: "Resignation", value: profile.resignationDate || "—" },
            ]} />
          </div>
        )}

        {activeTab === "employment" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Cost Center", value: profile.costCenter, key: "costCenter" },
                { label: "Shift Group", value: profile.shiftGroup, key: "shiftGroup" },
                { label: "Warehouse", value: profile.warehouse?.name, key: "warehouseId" },
              ].map(item => (
                <div key={item.key} className="p-3 bg-white/[0.03] rounded-lg border border-white/5">
                  <div className="text-[10px] text-white/30 uppercase">{item.label}</div>
                  <div className="text-sm text-white/70 mt-1">{item.value || "—"}</div>
                </div>
              ))}
            </div>
            {/* Document Completion */}
            <InvGlassCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white/70">📄 Document Status</h3>
                {docsComplete ? (
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-full">Complete</span>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-full">{missingDocs.length} Missing</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DOC_TYPES.slice(0, 6).map(dt => {
                  const doc = profile.documents.find(d => d.docType === dt);
                  return (
                    <div key={dt} className={`p-2 rounded-lg border text-[10px] ${doc?.status === "uploaded" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : doc?.status === "expired" ? "bg-red-500/5 border-red-500/20 text-red-300" : "bg-white/[0.02] border-white/5 text-white/30"}`}>
                      <div className="font-medium">{dt}</div>
                      <div className="text-[9px] mt-0.5">{doc?.status || "Missing"}</div>
                    </div>
                  );
                })}
              </div>
            </InvGlassCard>
          </div>
        )}

        {activeTab === "documents" && (
          <DocumentsTab documents={profile.documents} employeeId={profile.id} upsertDoc={upsertDoc} />
        )}

        {activeTab === "assignments" && (
          <AssignmentsTab assignments={profile.assignments} employeeId={profile.id} upsertAssignment={upsertAssignment} deleteAssignment={deleteAssignment} />
        )}

        {activeTab === "timeline" && (
          <TimelineTab events={profile.timeline} />
        )}
      </div>
    </div>
  );
}

// ── Info Card ──
function InfoCard({ title, items }: { title: string; items: { label: string; value: string | null }[] }) {
  return (
    <InvGlassCard>
      <h3 className="text-xs font-bold text-white/70 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between text-[11px]">
            <span className="text-white/30">{item.label}</span>
            <span className="text-white/70 text-right max-w-[60%] truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </InvGlassCard>
  );
}

// ── Documents Tab ──
function DocumentsTab({ documents, employeeId, upsertDoc }: { documents: any[]; employeeId: number; upsertDoc: any }) {
  const [newDoc, setNewDoc] = useState({ docType: "KTP", docName: "" });

  const handleUpload = async (docType: string) => {
    await upsertDoc.mutateAsync({
      employeeId, data: { docType, docName: docType, status: "uploaded" },
    });
  };

  return (
    <div className="space-y-3">
      {DOC_TYPES.map(dt => {
        const doc = documents.find(d => d.docType === dt);
        return (
          <div key={dt} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/5">
            <div className={`w-2 h-2 rounded-full ${doc?.status === "uploaded" ? "bg-emerald-400" : doc?.status === "expired" ? "bg-red-400" : "bg-white/20"}`} />
            <div className="flex-1">
              <div className="text-xs font-medium text-white/70">{dt}</div>
              <div className="text-[10px] text-white/30">{doc ? `Status: ${doc.status}` : "Not uploaded"}</div>
            </div>
            {doc?.uploadedAt && <div className="text-[9px] text-white/20">{new Date(doc.uploadedAt).toLocaleDateString()}</div>}
            {!doc && (
              <button onClick={() => handleUpload(dt)}
                className="px-2 py-1 text-[9px] bg-blue-500/15 text-blue-300 rounded hover:bg-blue-500/25 transition-all">
                Mark Uploaded
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Assignments Tab ──
function AssignmentsTab({ assignments, employeeId, upsertAssignment, deleteAssignment }: { assignments: any[]; employeeId: number; upsertAssignment: any; deleteAssignment: any }) {
  const [newType, setNewType] = useState("warehouse");
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await upsertAssignment.mutateAsync({
      employeeId, data: { assignmentType: newType, targetName: newName, isPrimary: true },
    });
    setNewName("");
  };

  const grouped = ASSIGNMENT_TYPES.map(t => ({
    type: t, label: ASSIGNMENT_LABELS[t],
    items: assignments.filter(a => a.assignmentType === t),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <select value={newType} onChange={e => setNewType(e.target.value)}
          className="px-2 py-2.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none min-h-10">
          {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{ASSIGNMENT_LABELS[t]}</option>)}
        </select>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Target name..."
          className="flex-1 px-2 py-2.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:border-blue-500/50 focus:outline-none min-h-10" />
        <button onClick={handleAdd}
          className="px-3 py-2.5 text-[10px] bg-blue-500/15 text-blue-300 rounded hover:bg-blue-500/25 transition-all min-h-10">
          + Add
        </button>
      </div>
      {grouped.map(g => (
        <div key={g.type}>
          <div className="text-[10px] text-white/30 uppercase font-bold mb-1">{g.label}</div>
          {g.items.length > 0 ? (
            <div className="space-y-1">
              {g.items.map(a => (
                <div key={a.id} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.isPrimary ? "bg-emerald-400" : "bg-white/20"}`} />
                  <span className="text-white/60 flex-1">{a.targetName || `#${a.targetId}`}</span>
                  <span className="text-[9px] text-white/20">{a.startDate}</span>
                  <button onClick={() => deleteAssignment.mutateAsync(a.id)}
                    className="text-red-400/30 hover:text-red-400 text-[9px]">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-white/15 py-1">No assignments</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Timeline Tab ──
function TimelineTab({ events }: { events: any[] }) {
  if (events.length === 0) return <div className="text-center py-12 text-white/20 text-xs">No events recorded</div>;
  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <div key={ev.id} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg">
          <span className="text-lg mt-0.5">{EVENT_ICONS[ev.eventType] || "📌"}</span>
          <div className="flex-1">
            <div className="text-xs font-medium text-white/70">{ev.eventType}</div>
            {ev.data && <div className="text-[10px] text-white/30 mt-1">{typeof ev.data === "object" ? JSON.stringify(ev.data) : String(ev.data)}</div>}
          </div>
          <div className="text-[9px] text-white/20 shrink-0">{new Date(ev.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
