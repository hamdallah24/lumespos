import { useState, useMemo } from "react";
import { useBranch } from "@/lib/branch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, Edit3, Trash2, X, Save, ChevronRight, ChevronDown,
  Users, Building2, Search, CheckCircle, XCircle, AlertTriangle,
  Sparkles, BarChart3, Clock, Star, TrendingUp, Info,
} from "lucide-react";
import {
  usePositionTree, usePositions, useDepartments, usePositionStats,
  usePositionSuggestions, useCreatePosition, useUpdatePosition, useDeletePosition,
} from "../hooks/useHr";
import type { Position, PositionTreeNode, PositionStats, PositionSuggestion } from "../types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const inputCls = "w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-red-500/50 transition-colors";
const labelCls = "text-[9px] text-white/30 uppercase tracking-wider mb-1 block";

const LEVELS = [
  { value: "executive", label: "Executive", color: "from-amber-500 to-orange-400", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "director", label: "Director", color: "from-purple-500 to-violet-400", badge: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  { value: "manager", label: "Manager", color: "from-blue-500 to-cyan-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "supervisor", label: "Supervisor", color: "from-emerald-500 to-teal-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "staff", label: "Staff", color: "from-slate-500 to-slate-400", badge: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  { value: "operator", label: "Operator", color: "from-cyan-500 to-sky-400", badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  { value: "intern", label: "Intern", color: "from-pink-500 to-rose-400", badge: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
];

const EMP_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "freelance", label: "Freelance" },
];

function getLevelBadge(level: string | null) {
  const l = LEVELS.find(x => x.value === level);
  if (!l) return "bg-white/5 text-white/30 border-white/10";
  return l.badge;
}

function getLevelLabel(level: string | null) {
  const l = LEVELS.find(x => x.value === level);
  return l?.label || level || "—";
}

function PositionForm({
  editPos, allPositions, departments, onClose,
}: {
  editPos?: Position | null; allPositions: Position[]; departments: any[]; onClose: () => void;
}) {
  const createMut = useCreatePosition();
  const updateMut = useUpdatePosition();
  const [tab, setTab] = useState<"info" | "capability">("info");
  const [form, setForm] = useState({
    title: editPos?.title || "",
    code: (editPos as any)?.code || "",
    departmentId: editPos?.departmentId ? String(editPos.departmentId) : "",
    grade: editPos?.grade || "",
    level: editPos?.level || "",
    reportsToPositionId: editPos?.reportsToPositionId ? String(editPos.reportsToPositionId) : "",
    successorPositionId: editPos?.successorPositionId ? String(editPos.successorPositionId) : "",
    baseSalary: editPos?.baseSalary || "0",
    responsibilities: editPos?.responsibilities || "",
    requiredSkills: editPos?.requiredSkills || "",
    competencyTags: editPos?.competencyTags || "",
    minExperience: editPos?.minExperience ? String(editPos.minExperience) : "",
    employmentType: editPos?.employmentType || "full_time",
    status: editPos?.status || "draft",
    isActive: editPos?.isActive ?? true,
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const parentOptions = allPositions.filter(p => p.id !== editPos?.id);

  const handleSave = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      grade: form.grade || null,
      level: form.level || null,
      reportsToPositionId: form.reportsToPositionId ? Number(form.reportsToPositionId) : null,
      successorPositionId: form.successorPositionId ? Number(form.successorPositionId) : null,
      baseSalary: form.baseSalary || "0",
      responsibilities: form.responsibilities || null,
      requiredSkills: form.requiredSkills || null,
      competencyTags: form.competencyTags || null,
      minExperience: form.minExperience ? Number(form.minExperience) : null,
      employmentType: form.employmentType,
      status: form.status,
      isActive: form.isActive,
    };
    if (editPos) updateMut.mutate({ id: editPos.id, data: payload }, { onSuccess: onClose });
    else createMut.mutate(payload, { onSuccess: onClose });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-red-400" />
            {editPos ? "Edit Position" : "New Position"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex border-b border-white/5 shrink-0">
          {(["info", "capability"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors
                ${tab === t ? "text-red-400 border-b-2 border-red-400" : "text-white/30 hover:text-white/50"}`}>
              {t === "info" ? "Information" : "Capability"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "info" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Chief Technology Officer"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Position Code</label>
                  <input value={(form as any).positionCode || ""} onChange={e => setForm({ ...form, positionCode: e.target.value } as any)}
                    placeholder="CEO, MGR-HR"
                    className={inputCls + " font-mono"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Department</label>
                  <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
                    className={inputCls + " appearance-none"}>
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code ? `${d.code} — ` : ""}{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Level</label>
                  <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                    className={inputCls + " appearance-none"}>
                    <option value="">— None —</option>
                    {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Grade</label>
                  <input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                    placeholder="Grade A"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className={inputCls + " appearance-none"}>
                    {["draft", "active", "deprecated", "archived"].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Base Salary</label>
                  <input value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })}
                    type="number" min="0"
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Reports To</label>
                <select value={form.reportsToPositionId} onChange={e => setForm({ ...form, reportsToPositionId: e.target.value })}
                  className={inputCls + " appearance-none"}>
                  <option value="">— None (Top Level) —</option>
                  {parentOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Successor Position</label>
                <select value={(form as any).successorPositionId || ""} onChange={e => setForm({ ...form, successorPositionId: e.target.value } as any)}
                  className={inputCls + " appearance-none"}>
                  <option value="">— None —</option>
                  {parentOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Employment Type</label>
                <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })}
                  className={inputCls + " appearance-none"}>
                  {EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Min. Experience (years)</label>
                <input value={form.minExperience} onChange={e => setForm({ ...form, minExperience: e.target.value })}
                  type="number" min="0" max="30" placeholder="0"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Competency Tags</label>
                <input value={(form as any).competencyTags || ""} onChange={e => setForm({ ...form, competencyTags: e.target.value } as any)}
                  placeholder="Leadership, Finance, Sales (comma separated)"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Responsibilities</label>
                <textarea value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })}
                  placeholder="Lead technology strategy, manage engineering teams..."
                  rows={3} className={inputCls + " resize-none h-auto py-2"} />
              </div>
              <div>
                <label className={labelCls}>Required Skills</label>
                <textarea value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })}
                  placeholder="Strategic planning, team leadership, budgeting..."
                  rows={3} className={inputCls + " resize-none h-auto py-2"} />
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end shrink-0">
          <button onClick={onClose}
            className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending || !form.title.trim()}
            className="h-9 px-4 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3 h-3" /> {editPos ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PosTreeNode({
  node, depth, onEdit, onDelete, stats,
}: {
  node: PositionTreeNode; depth: number; onEdit: (p: Position) => void; onDelete: (p: Position) => void;
  stats?: Map<number, PositionStats>;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const s = stats?.get(node.positionId);

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}>
        <button onClick={() => setExpanded(!expanded)}
          className={`w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-white/50 shrink-0
            ${hasChildren ? "" : "invisible"}`}>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <Briefcase className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {(node as any).positionCode && <span className="text-[9px] font-mono text-red-400/60 bg-red-500/5 px-1.5 py-0.5 rounded">{(node as any).positionCode}</span>}
            <span className="text-xs text-white/80 font-medium truncate">{node.title}</span>
            {node.level && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase border ${getLevelBadge(node.level)}`}>
                {getLevelLabel(node.level)}
              </span>
            )}
            {!node.isActive && <XCircle className="w-3 h-3 text-white/20 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {node.departmentName && <span className="text-[9px] text-white/20">{node.departmentName}</span>}
            {node.grade && <span className="text-[9px] text-white/15 font-mono">Grade {node.grade}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[9px] text-white/20">
            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{node.employeeCount ?? 0}</span>
            {s && s.avgTenureMonths > 0 && (
              <span className="flex items-center gap-0.5 hidden md:flex"><Clock className="w-2.5 h-2.5" />{s.avgTenureMonths}mo</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(node)}
              className="w-8 h-8 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-amber-400 hover:bg-amber-500/10 min-h-10 lg:min-h-0">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(node)}
              className="w-8 h-8 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10 min-h-10 lg:min-h-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {node.children.map(child => (
              <PosTreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} stats={stats} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsSidebar({ stats, positions }: { stats?: PositionStats[]; positions: Position[] }) {
  const levelDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of LEVELS) map.set(l.value, 0);
    for (const p of positions) {
      if (p.level && map.has(p.level)) map.set(p.level, (map.get(p.level) || 0) + 1);
    }
    return map;
  }, [positions]);

  const totalEmployees = stats?.reduce((s, x) => s + x.employeeCount, 0) ?? 0;
  const avgTenure = stats && stats.length > 0
    ? Math.round(stats.reduce((s, x) => s + x.avgTenureMonths, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-3">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Position Overview</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2">
            <p className="text-[8px] text-white/20 uppercase">Positions</p>
            <p className="text-sm font-bold text-white/70">{positions.length}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <p className="text-[8px] text-white/20 uppercase">Total Staff</p>
            <p className="text-sm font-bold text-blue-400">{totalEmployees}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <p className="text-[8px] text-white/20 uppercase">Avg Tenure</p>
            <p className="text-sm font-bold text-emerald-400">{avgTenure}mo</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <p className="text-[8px] text-white/20 uppercase">Active</p>
            <p className="text-sm font-bold text-amber-400">{positions.filter(p => p.isActive).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Level Distribution</p>
        <div className="space-y-1.5">
          {LEVELS.map(l => {
            const count = levelDistribution.get(l.value) || 0;
            const maxCount = Math.max(...Array.from(levelDistribution.values()), 1);
            return (
              <div key={l.value} className="flex items-center gap-2">
                <span className="text-[9px] text-white/30 w-16 truncate">{l.label}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${l.color} transition-all`}
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-[9px] text-white/20 w-4 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Top Positions by Staff</p>
        <div className="space-y-1">
          {(stats || [])
            .sort((a, b) => b.employeeCount - a.employeeCount)
            .slice(0, 5)
            .map(s => (
              <div key={s.positionId} className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.02]">
                <span className="text-[10px] text-white/60 truncate">{s.title}</span>
                <span className="text-[9px] text-white/30 font-mono">{s.employeeCount}</span>
              </div>
            ))}
          {(!stats || stats.length === 0) && (
            <p className="text-[10px] text-white/15 text-center py-2">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AISuggestions({ suggestions }: { suggestions: PositionSuggestion[] }) {
  if (!suggestions || suggestions.length === 0) return null;

  const severityConfig = {
    critical: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
      <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-400" /> AI Suggestions
      </p>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => {
          const cfg = severityConfig[s.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border ${cfg.bg}`}>
              <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium ${cfg.color}`}>{s.title}</p>
                <p className="text-[9px] text-white/30 mt-0.5">{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PositionWorkspace() {
  const { branchId } = useBranch();
  const { data: tree, isLoading: treeLoading } = usePositionTree();
  const { data: allPositions } = usePositions();
  const { data: departments } = useDepartments();
  const { data: stats } = usePositionStats();
  const { data: suggestions } = usePositionSuggestions();
  const deleteMut = useDeletePosition();

  const [showForm, setShowForm] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<PositionTreeNode | null>(null);

  const statsMap = useMemo(() => {
    const m = new Map<number, PositionStats>();
    for (const s of stats || []) m.set(s.positionId, s);
    return m;
  }, [stats]);

  const handleEdit = (p: Position) => { setEditPos(p); setShowForm(true); };
  const handleDelete = async (p: Position) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    deleteMut.mutate(p.id);
  };

  const renderTree = (nodes: PositionTreeNode[], depth = 0) =>
    nodes.map(n => <PosTreeNode key={n.id} node={n} depth={depth} onEdit={handleEdit} onDelete={handleDelete} stats={statsMap} />);

  const totalPositions = allPositions?.length ?? 0;
  const activePositions = allPositions?.filter(p => p.isActive).length ?? 0;
  const totalStaff = stats?.reduce((s, x) => s + x.employeeCount, 0) ?? 0;

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Positions</h1>
              <p className="text-[10px] text-white/30">Position hierarchy, capabilities & intelligence</p>
            </div>
          </div>
          <button onClick={() => { setEditPos(null); setShowForm(true); }}
            className="h-9 px-3 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Position
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Positions</p>
            <p className="text-lg font-bold text-white/70">{totalPositions}</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Active</p>
            <p className="text-lg font-bold text-emerald-400">{activePositions}</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Staff</p>
            <p className="text-lg font-bold text-blue-400">{totalStaff}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search positions..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-red-500/30" />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {suggestions && suggestions.length > 0 && (
              <div className="mb-4">
                <AISuggestions suggestions={suggestions} />
              </div>
            )}

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden py-1">
              {treeLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-white/20 mt-3">Loading positions...</p>
                </div>
              ) : tree && tree.length > 0 ? renderTree(tree) : (
                <div className="py-12 text-center">
                  <Briefcase className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/20">No positions yet</p>
                  <button onClick={() => { setEditPos(null); setShowForm(true); }}
                    className="h-9 px-4 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 mt-3 inline-flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Create First Position
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="w-72 shrink-0 hidden lg:block">
            <StatsSidebar stats={stats} positions={allPositions || []} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <PositionForm editPos={editPos} allPositions={allPositions || []} departments={departments || []}
            onClose={() => { setShowForm(false); setEditPos(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
