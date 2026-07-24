import { useState } from "react";
import { useBranch } from "@/lib/branch";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Plus, Edit3, Trash2, X, Save, RefreshCw, ArrowRight, Hash, CheckCircle, XCircle, Beaker } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";

interface Uom { id: number; branchId: number; code: string; name: string; type: string; decimalPlaces: number; isActive: boolean; createdAt: string; }
interface UomConversion { id: number; branchId: number; fromUomId: number; toUomId: number; conversionFactor: string; isActive: boolean; fromUomCode?: string; fromUomName?: string; }

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const uomTypes = ["count", "weight", "volume", "length", "time"];
const typeLabels: Record<string, string> = { count: "Count", weight: "Weight", volume: "Volume", length: "Length", time: "Time" };

function useUoms(branchId: number) { return useQuery<Uom[]>({ queryKey: ["uoms", branchId], queryFn: async () => { const r = await apiFetch(`/api/uoms?branchId=${branchId}`); if (!r.ok) throw new Error("Gagal"); return r.json(); }, enabled: !!branchId }); }
function useAllUoms(branchId: number) { return useQuery<Uom[]>({ queryKey: ["uoms", "all", branchId], queryFn: async () => { const r = await apiFetch(`/api/uoms/all?branchId=${branchId}`); if (!r.ok) throw new Error("Gagal"); return r.json(); }, enabled: !!branchId }); }
function useUomConversions(branchId: number) { return useQuery<UomConversion[]>({ queryKey: ["uom-conversions", branchId], queryFn: async () => { const r = await apiFetch(`/api/uom-conversions?branchId=${branchId}`); if (!r.ok) throw new Error("Gagal"); return r.json(); }, enabled: !!branchId }); }

function UomForm({ id, onClose }: { id?: number | null; onClose: () => void }) {
  const qc = useQueryClient(); const { branchId } = useBranch();
  const { data: allUoms } = useAllUoms(branchId || 1);
  const editUom = allUoms?.find(u => u.id === id);
  const [form, setForm] = useState<any>(id ? { code: editUom?.code || "", name: editUom?.name || "", type: editUom?.type || "count", decimalPlaces: editUom?.decimalPlaces || 0 } : { code: "", name: "", type: "count", decimalPlaces: 0 });

  const createMut = useMutation({ mutationFn: async (d: any) => { const r = await apiFetch("/api/uoms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["uoms"] }); onClose(); } });
  const updateMut = useMutation({ mutationFn: async (d: any) => { const r = await apiFetch(`/api/uoms/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["uoms"] }); onClose(); } });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Scale className="w-4 h-4 text-amber-400" /> {id ? "Edit UOM" : "New UOM"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PCS"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pieces"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
                {uomTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Decimal Places</label>
              <input value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: Number(e.target.value) })} type="number" min="0" max="6"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Cancel</button>
          <button onClick={() => { if (!form.code || !form.name) return; const payload = { ...form, branchId: branchId || 1 }; if (id) updateMut.mutate(payload); else createMut.mutate(payload); }}
            disabled={createMut.isPending || updateMut.isPending}
            className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3 h-3" /> {id ? "Update" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConversionManager({ onClose }: { onClose: () => void }) {
  const { branchId } = useBranch(); const qc = useQueryClient();
  const { data: allUoms } = useAllUoms(branchId || 1);
  const { data: conversions, isLoading } = useUomConversions(branchId || 1);
  const [form, setForm] = useState({ fromUomId: "", toUomId: "", conversionFactor: "" });

  const addConv = useMutation({
    mutationFn: async (d: any) => { const r = await apiFetch("/api/uom-conversions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["uom-conversions"] }); setForm({ fromUomId: "", toUomId: "", conversionFactor: "" }); },
  });

  const delConv = useMutation({
    mutationFn: async (id: number) => { const r = await apiFetch(`/api/uom-conversions/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["uom-conversions"] }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0d1128] z-10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowRight className="w-4 h-4 text-amber-400" /> UOM Conversions</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[8px] text-white/30 uppercase tracking-wider mb-1 block">From</label>
              <select value={form.fromUomId} onChange={(e) => setForm({ ...form, fromUomId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
                <option value="">— Select —</option>
                {allUoms?.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
              </select>
            </div>
            <span className="text-white/20 text-xs pb-2">→</span>
            <div className="flex-1">
              <label className="text-[8px] text-white/30 uppercase tracking-wider mb-1 block">To</label>
              <select value={form.toUomId} onChange={(e) => setForm({ ...form, toUomId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
                <option value="">— Select —</option>
                {allUoms?.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
              </select>
            </div>
            <div className="w-20">
              <label className="text-[8px] text-white/30 uppercase tracking-wider mb-1 block">Factor</label>
              <input value={form.conversionFactor} onChange={(e) => setForm({ ...form, conversionFactor: e.target.value })} placeholder="12"
                className="w-full h-10 px-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
            <button onClick={() => { if (!form.fromUomId || !form.toUomId || !form.conversionFactor) return; addConv.mutate({ ...form, branchId: branchId || 1 }); }}
              disabled={addConv.isPending}
              className="h-10 px-3 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50">Add</button>
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2 font-medium">Conversion Rules</p>
            {isLoading ? (
              <p className="text-xs text-white/20 text-center py-3">Loading...</p>
            ) : conversions && conversions.length > 0 ? (
              <div className="space-y-1">
                {conversions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white font-medium">{c.fromUomCode || `#${c.fromUomId}`}</span>
                      <span className="text-white/20">→</span>
                      <span className="text-white/80">{c.fromUomName || `#${c.toUomId}`}</span>
                      <span className="text-white/30">×{c.conversionFactor}</span>
                    </div>
                    <button onClick={() => delConv.mutate(c.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/20 text-center py-3">No conversions yet</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UomWorkspace() {
  const { branchId } = useBranch(); const qc = useQueryClient();
  const { data: uoms, isLoading, refetch } = useUoms(branchId || 1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showConv, setShowConv] = useState(false);

  const delMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiFetch(`/api/uoms/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["uoms"] }),
  });

  const seedMut = useMutation({
    mutationFn: async () => { const r = await apiFetch("/api/uoms/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId }) }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["uoms"] }); },
  });

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><Scale className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-base font-bold text-white">Unit of Measure</h1>
              <p className="text-[10px] text-white/30">{uoms?.length || 0} UOMs across {uomTypes.length} types</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
              className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><Beaker className="w-3.5 h-3.5" /> Seed Defaults</button>
            <button onClick={() => setShowConv(true)}
              className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> Conversions</button>
            <button onClick={() => { setEditId(null); setShowForm(true); }}
              className="h-9 px-3 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add UOM</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {uomTypes.map((type) => {
            const count = uoms?.filter(u => u.type === type).length || 0;
            const colors: Record<string, string> = { count: "from-blue-500 to-blue-400", weight: "from-emerald-500 to-emerald-400", volume: "from-cyan-500 to-cyan-400", length: "from-amber-500 to-amber-400", time: "from-purple-500 to-purple-400" };
            return (
              <div key={type} className="bg-white/5 rounded-xl p-3">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">{typeLabels[type]}</p>
                <p className="text-lg font-bold text-white mt-0.5">{count}</p>
                <div className={"h-1 rounded-full bg-gradient-to-r mt-2 opacity-60 " + (colors[type] || "from-white/20 to-white/10")} style={{ width: `${Math.min(100, (count / Math.max(...uomTypes.map(t => uoms?.filter(u => u.type === t).length || 0), 1)) * 100)}%` }} />
              </div>
            );
          })}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Decimals</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-white/20 text-xs">Loading UOMs...</td></tr>
                ) : uoms && uoms.length > 0 ? (
                  uoms.map((u, i) => (
                    <motion.tr key={u.id} {...fadeUp} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-mono font-semibold text-sm">{u.code}</span>
                      </td>
                      <td className="px-4 py-3 text-white/80">{u.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={"px-2 py-0.5 rounded-md text-[9px] font-medium " + ({
                          count: "bg-blue-500/10 text-blue-400",
                          weight: "bg-emerald-500/10 text-emerald-400",
                          volume: "bg-cyan-500/10 text-cyan-400",
                          length: "bg-amber-500/10 text-amber-400",
                          time: "bg-purple-500/10 text-purple-400",
                        }[u.type] || "bg-white/5 text-white/40")}>{typeLabels[u.type] || u.type}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell text-white/50">{u.decimalPlaces}</td>
                      <td className="px-4 py-3 text-center">
                        {u.isActive ? <span className="text-[9px] text-emerald-400/80 flex items-center justify-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Active</span>
                          : <span className="text-[9px] text-rose-400/80 flex items-center justify-center gap-1"><XCircle className="w-2.5 h-2.5" />Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditId(u.id); setShowForm(true); }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm("Delete this UOM?")) delMut.mutate(u.id); }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center py-12">
                    <Scale className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/20">No UOMs found</p>
                    <div className="flex gap-2 justify-center mt-3">
                      <button onClick={() => seedMut.mutate()} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Seed Defaults</button>
                      <button onClick={() => { setEditId(null); setShowForm(true); }}
                        className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30">Add First UOM</button>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>{showForm && <UomForm id={editId} onClose={() => { setShowForm(false); setEditId(null); }} />}</AnimatePresence>
      <AnimatePresence>{showConv && <ConversionManager onClose={() => setShowConv(false)} />}</AnimatePresence>
    </div>
  );
}