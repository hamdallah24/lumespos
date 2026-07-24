import { useState, useMemo } from "react";
import { useBranch } from "@/lib/branch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, Edit3, Trash2, X, Save, ChevronRight, ChevronDown,
  Users, Briefcase, Search, Filter, CheckCircle, XCircle, Layers,
} from "lucide-react";
import {
  useDepartmentTree, useDepartments, useCreateDepartment,
  useUpdateDepartment, useDeleteDepartment, usePositions, useEmployees,
} from "../hooks/useHr";
import type { DepartmentTreeNode, Department } from "../types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const inputCls = "w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-red-500/50 transition-colors";
const labelCls = "text-[9px] text-white/30 uppercase tracking-wider mb-1 block";

function DeptForm({
  branchId, editDept, allDepts, onClose,
}: {
  branchId: number; editDept?: Department | null; allDepts: Department[]; onClose: () => void;
}) {
  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const [form, setForm] = useState({
    code: editDept?.code || "",
    name: editDept?.name || "",
    description: editDept?.description || "",
    parentId: editDept?.parentId ? String(editDept.parentId) : "",
    isActive: editDept?.isActive ?? true,
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const parentOptions = allDepts.filter(d => d.id !== editDept?.id);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      code: form.code || null,
      name: form.name.trim(),
      description: form.description || null,
      parentId: form.parentId ? Number(form.parentId) : null,
      branchId,
      isActive: form.isActive,
    };
    if (editDept) updateMut.mutate({ id: editDept.id, data: payload }, { onSuccess: onClose });
    else createMut.mutate(payload, { onSuccess: onClose });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-400" />
            {editDept ? "Edit Department" : "New Department"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="HR, FIN, WH"
                className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Human Resources"
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className={inputCls + " resize-none h-auto py-2"} />
          </div>
          <div>
            <label className={labelCls}>Parent Department</label>
            <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}
              className={inputCls + " appearance-none"}>
              <option value="">— Root Level —</option>
              {parentOptions.map(d => (
                <option key={d.id} value={d.id}>{d.code ? `${d.code} — ` : ""}{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className={labelCls}>Status</label>
            <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-emerald-500/30" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${form.isActive ? "translate-x-5 bg-emerald-400" : "bg-white/30"}`} />
            </button>
            <span className={`text-[10px] font-medium ${form.isActive ? "text-emerald-400" : "text-white/30"}`}>
              {form.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
          <button onClick={onClose}
            className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending || !form.name.trim()}
            className="h-9 px-4 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3 h-3" /> {editDept ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TreeNode({
  node, depth, onEdit, onDelete,
}: {
  node: DepartmentTreeNode; depth: number; onEdit: (d: Department) => void; onDelete: (d: Department) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}>
        <button onClick={() => setExpanded(!expanded)}
          className={`w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-white/50 shrink-0
            ${hasChildren ? "" : "invisible"}`}>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <Building2 className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {node.code && <span className="text-[9px] font-mono text-red-400/60 bg-red-500/5 px-1.5 py-0.5 rounded">{node.code}</span>}
            <span className="text-xs text-white/80 font-medium truncate">{node.name}</span>
            {!node.isActive && <XCircle className="w-3 h-3 text-white/20 shrink-0" />}
          </div>
          {node.description && <p className="text-[10px] text-white/20 truncate mt-0.5">{node.description}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {node.managerName && (
            <span className="text-[9px] text-white/30 hidden md:block">{node.managerName}</span>
          )}
          <div className="flex items-center gap-1.5 text-[9px] text-white/20">
            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{node.employeeCount ?? 0}</span>
            <span className="flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{node.positionCount ?? 0}</span>
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
              <TreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeptTable({
  depts, onEdit, onDelete, search,
}: {
  depts: Department[]; onEdit: (d: Department) => void; onDelete: (d: Department) => void; search: string;
}) {
  const filtered = useMemo(() => {
    if (!search) return depts;
    const q = search.toLowerCase();
    return depts.filter(d => d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)));
  }, [depts, search]);

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Parent</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Manager</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12">
                <Building2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/20">
                  {search ? "No departments match your search" : "No departments yet"}
                </p>
              </td></tr>
            ) : (
              filtered.map((d, i) => (
                <motion.tr key={d.id} {...fadeUp} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    {d.code ? <span className="font-mono text-red-400/70 bg-red-500/5 px-2 py-0.5 rounded text-[10px]">{d.code}</span>
                      : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/80 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-white/40 hidden md:table-cell">{d.parentId ? `#${d.parentId}` : "Root"}</td>
                  <td className="px-4 py-3 text-white/40 hidden md:table-cell">{d.managerEmployeeId ? `#${d.managerEmployeeId}` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {d.isActive ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60 mx-auto" />
                      : <XCircle className="w-3.5 h-3.5 text-white/15 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(d)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(d)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DepartmentWorkspace() {
  const { branchId } = useBranch();
  const bid = branchId || 1;
  const { data: tree, isLoading: treeLoading } = useDepartmentTree(bid);
  const { data: flatDepts } = useDepartments(bid);
  const { data: positions } = usePositions();
  const { data: employees } = useEmployees(bid);
  const deleteMut = useDeleteDepartment();

  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

  const totalDepts = flatDepts?.length ?? 0;
  const activeDepts = flatDepts?.filter(d => d.isActive).length ?? 0;
  const rootDepts = flatDepts?.filter(d => !d.parentId).length ?? 0;
  const deptsWithEmployees = flatDepts?.filter(d =>
    employees?.some(e => e.departmentId === d.id)
  ).length ?? 0;

  const handleEdit = (d: Department) => { setEditDept(d); setShowForm(true); };
  const handleDelete = (d: Department) => {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(d.id);
  };

  const renderTree = (nodes: DepartmentTreeNode[], depth = 0) =>
    nodes.map(n => <TreeNode key={n.id} node={n} depth={depth} onEdit={handleEdit} onDelete={handleDelete} />);

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Departments</h1>
              <p className="text-[10px] text-white/30">Organizational structure and hierarchy</p>
            </div>
          </div>
          <button onClick={() => { setEditDept(null); setShowForm(true); }}
            className="h-9 px-3 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Department
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Total", value: totalDepts, icon: Layers, color: "text-white/60" },
            { label: "Active", value: activeDepts, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Root Level", value: rootDepts, icon: Building2, color: "text-red-400" },
            { label: "With Staff", value: deptsWithEmployees, icon: Users, color: "text-blue-400" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-red-500/30" />
          </div>
          <div className="flex bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button onClick={() => setViewMode("tree")}
              className={`h-8 px-3 rounded-lg text-[10px] font-medium transition-colors ${viewMode === "tree" ? "bg-red-500/20 text-red-400" : "text-white/30 hover:text-white/50"}`}>
              Tree
            </button>
            <button onClick={() => setViewMode("table")}
              className={`h-8 px-3 rounded-lg text-[10px] font-medium transition-colors ${viewMode === "table" ? "bg-red-500/20 text-red-400" : "text-white/30 hover:text-white/50"}`}>
              Table
            </button>
          </div>
        </div>

        {/* Content */}
        {treeLoading ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-white/20 mt-3">Loading departments...</p>
          </div>
        ) : viewMode === "tree" ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden py-1">
            {tree && tree.length > 0 ? renderTree(tree) : (
              <div className="py-12 text-center">
                <Building2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/20">No departments yet</p>
                <button onClick={() => { setEditDept(null); setShowForm(true); }}
                  className="h-9 px-4 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 mt-3 inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Create First Department
                </button>
              </div>
            )}
          </div>
        ) : (
          <DeptTable depts={flatDepts || []} onEdit={handleEdit} onDelete={handleDelete} search={search} />
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <DeptForm branchId={bid} editDept={editDept} allDepts={flatDepts || []}
            onClose={() => { setShowForm(false); setEditDept(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
