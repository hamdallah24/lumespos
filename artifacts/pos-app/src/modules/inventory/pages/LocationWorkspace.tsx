import { useState } from "react";
import { useBranch } from "@/lib/branch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/csrf";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Edit3, Trash2, X, Save, RefreshCw, Search, Warehouse, Layers, Hash, CheckCircle, XCircle, Upload } from "lucide-react";

interface Bin { id: number; branchId: number; warehouseId: number; code: string; zone: string | null; aisle: string | null; rack: string | null; shelf: string | null; bin: string | null; capacity: string | null; isActive: boolean; createdAt: string; }
interface Warehouse { id: number; name: string; code: string; }

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function useBins(branchId: number, warehouseId?: number, q?: string) {
  return useQuery<Bin[]>({
    queryKey: ["bins", branchId, warehouseId, q],
    queryFn: async () => {
      const sp = new URLSearchParams({ branchId: String(branchId) });
      if (warehouseId) sp.set("warehouseId", String(warehouseId));
      if (q) sp.set("q", q);
      const r = await apiFetch(`/api/bins?${sp}`);
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    enabled: !!branchId,
  });
}

function useWarehousesSimple() {
  return useQuery<Warehouse[]>({
    queryKey: ["warehouses-simple"],
    queryFn: async () => { const r = await apiFetch("/api/inventory/warehouses"); if (!r.ok) throw new Error("Gagal"); return r.json(); },
  });
}

function BinForm({ id, onClose }: { id?: number | null; onClose: () => void }) {
  const qc = useQueryClient(); const { branchId } = useBranch();
  const { data: warehouses } = useWarehousesSimple();
  const { data: bins } = useBins(branchId || 1);
  const editBin = bins?.find(b => b.id === id);
  const [form, setForm] = useState<any>(id ? {
    code: editBin?.code || "", warehouseId: editBin?.warehouseId || "",
    zone: editBin?.zone || "", aisle: editBin?.aisle || "", rack: editBin?.rack || "",
    shelf: editBin?.shelf || "", bin: editBin?.bin || "", capacity: editBin?.capacity || "",
  } : { code: "", warehouseId: "", zone: "", aisle: "", rack: "", shelf: "", bin: "", capacity: "" });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiFetch("/api/bins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bins"] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiFetch(`/api/bins/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bins"] }); onClose(); },
  });

  const wh = warehouses?.find(w => w.id === Number(form.warehouseId));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400" /> {id ? "Edit Bin" : "New Bin"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Warehouse</label>
            <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
              <option value="">— Select —</option>
              {warehouses?.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A-01-04-2-1"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Capacity</label>
              <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="1000"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium">Location Hierarchy</p>
          <div className="grid grid-cols-5 gap-1.5">
            {["zone", "aisle", "rack", "shelf", "bin"].map((field) => (
              <div key={field}>
                <label className="text-[7px] text-white/20 uppercase block mb-0.5">{field}</label>
                <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder={field}
                  className="w-full h-9 px-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] placeholder-white/15 outline-none focus:border-amber-500/50 text-center" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Cancel</button>
          <button onClick={() => { if (!form.code || !form.warehouseId) return; const payload = { ...form, branchId: branchId || 1, warehouseId: Number(form.warehouseId), capacity: form.capacity || null }; if (id) updateMut.mutate(payload); else createMut.mutate(payload); }}
            disabled={createMut.isPending || updateMut.isPending}
            className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Save className="w-3 h-3" /> {id ? "Update" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient(); const { branchId } = useBranch();
  const { data: warehouses } = useWarehousesSimple();
  const [whId, setWhId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [zones, setZones] = useState("A,B,C");
  const [aisles, setAisles] = useState("01,02,03");
  const [racks, setRacks] = useState("01,02,03,04");
  const [shelves, setShelves] = useState("1,2,3");
  const [bins, setBins] = useState("1,2");

  const bulkMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiFetch("/api/bins/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bins"] }); onClose(); },
  });

  const generateBulk = () => {
    if (!whId) return;
    const binList: any[] = [];
    for (const z of zones.split(",").map(s => s.trim()).filter(Boolean)) {
      for (const a of aisles.split(",").map(s => s.trim()).filter(Boolean)) {
        for (const r of racks.split(",").map(s => s.trim()).filter(Boolean)) {
          for (const s of shelves.split(",").map(s => s.trim()).filter(Boolean)) {
            for (const b of bins.split(",").map(s => s.trim()).filter(Boolean)) {
              binList.push({
                branchId: Number(branchId || 1),
                warehouseId: Number(whId),
                code: `${prefix}${z}-${a}-${r}-${s}-${b}`,
                zone: z, aisle: a, rack: r, shelf: s, bin: b,
              });
            }
          }
        }
      }
    }
    if (binList.length > 0) bulkMut.mutate({ bins: binList });
  };

  const total = (zones.split(",").filter(Boolean).length || 1) *
    (aisles.split(",").filter(Boolean).length || 1) *
    (racks.split(",").filter(Boolean).length || 1) *
    (shelves.split(",").filter(Boolean).length || 1) *
    (bins.split(",").filter(Boolean).length || 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d1128] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Upload className="w-4 h-4 text-amber-400" /> Bulk Generate Bins</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Warehouse</label>
            <select value={whId} onChange={(e) => setWhId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none focus:border-amber-500/50">
              <option value="">— Select —</option>
              {warehouses?.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-wider mb-1 block">Code Prefix</label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="WH1-"
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Zones", val: zones, set: setZones },
              { label: "Aisles", val: aisles, set: setAisles },
              { label: "Racks", val: racks, set: setRacks },
              { label: "Shelves", val: shelves, set: setShelves },
              { label: "Bins", val: bins, set: setBins },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[7px] text-white/20 uppercase block mb-0.5">{f.label}</label>
                <input value={f.val} onChange={(e) => f.set(e.target.value)}
                  className="w-full h-9 px-1 rounded-lg bg-white/5 border border-white/10 text-white text-[9px] placeholder-white/15 outline-none focus:border-amber-500/50 text-center" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/40 text-center">Will generate <span className="text-white font-semibold">{total}</span> bins</p>
        </div>
        <div className="p-4 border-t border-white/5 flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Cancel</button>
          <button onClick={generateBulk} disabled={!whId || bulkMut.isPending}
            className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1.5">
            <Upload className="w-3 h-3" /> Generate {total} Bins
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LocationWorkspace() {
  const { branchId } = useBranch(); const qc = useQueryClient();
  const { data: warehouses } = useWarehousesSimple();
  const [search, setSearch] = useState("");
  const [whFilter, setWhFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: bins, isLoading, refetch } = useBins(branchId || 1, whFilter ? Number(whFilter) : undefined, search || undefined);

  const delMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiFetch(`/api/bins/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Gagal"); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bins"] }),
  });

  const zones = bins ? [...new Set(bins.map(b => b.zone).filter(Boolean))] : [];
  const whBins = bins || [];

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><MapPin className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-base font-bold text-white">Bin Management</h1>
              <p className="text-[10px] text-white/30">{bins?.length || 0} bins across {zones.length} zones</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)}
              className="h-9 px-3 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Bulk Generate</button>
            <button onClick={() => { setEditId(null); setShowForm(true); }}
              className="h-9 px-3 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Bin</button>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bin code..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/50" />
          </div>
          <select value={whFilter} onChange={(e) => setWhFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none appearance-none min-w-[140px] focus:border-amber-500/50">
            <option value="">All Warehouses</option>
            {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => refetch()} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60"><RefreshCw className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {zones.slice(0, 8).map((z) => {
            const count = whBins.filter(b => b.zone === z).length;
            const colors = ["bg-blue-500/10 text-blue-400", "bg-emerald-500/10 text-emerald-400", "bg-amber-500/10 text-amber-400", "bg-rose-500/10 text-rose-400", "bg-purple-500/10 text-purple-400", "bg-cyan-500/10 text-cyan-400", "bg-orange-500/10 text-orange-400", "bg-teal-500/10 text-teal-400"];
            return (
              <div key={z} className={"shrink-0 px-3 py-2 rounded-xl text-xs font-medium " + (colors[zones.indexOf(z) % colors.length] || "bg-white/5 text-white/40")}>
                <span className="opacity-60">{z}</span> · {count}
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
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Warehouse</th>
                  <th className="text-center px-3 py-3 font-medium hidden md:table-cell">Z/A/R/S/B</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Capacity</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-white/20 text-xs">Loading bins...</td></tr>
                ) : bins && bins.length > 0 ? (
                  bins.map((b, i) => {
                    const wh = warehouses?.find(w => w.id === b.warehouseId);
                    return (
                      <motion.tr key={b.id} {...fadeUp} transition={{ delay: i * 0.01 }}
                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-white font-mono text-xs font-medium">{b.code}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-white/50 text-[10px]">{wh?.name || `WH #${b.warehouseId}`}</td>
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1 text-[9px] text-white/30">
                            <span className={b.zone ? "text-white/70" : "text-white/20"}>{b.zone || "—"}</span>
                            <span className="text-white/10">/</span>
                            <span className={b.aisle ? "text-white/70" : "text-white/20"}>{b.aisle || "—"}</span>
                            <span className="text-white/10">/</span>
                            <span className={b.rack ? "text-white/70" : "text-white/20"}>{b.rack || "—"}</span>
                            <span className="text-white/10">/</span>
                            <span className={b.shelf ? "text-white/70" : "text-white/20"}>{b.shelf || "—"}</span>
                            <span className="text-white/10">/</span>
                            <span className={b.bin ? "text-white/70" : "text-white/20"}>{b.bin || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-white/50 text-[10px]">{b.capacity || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {b.isActive ? <span className="text-[9px] text-emerald-400/80 flex items-center justify-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Active</span>
                            : <span className="text-[9px] text-rose-400/80 flex items-center justify-center gap-1"><XCircle className="w-2.5 h-2.5" />Inactive</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditId(b.id); setShowForm(true); }}
                              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-500/10"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { if (confirm("Delete this bin?")) delMut.mutate(b.id); }}
                              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="text-center py-12">
                    <MapPin className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/20">No bins found</p>
                    <div className="flex gap-2 justify-center mt-3">
                      <button onClick={() => setShowBulk(true)} className="h-9 px-4 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10">Bulk Generate</button>
                      <button onClick={() => { setEditId(null); setShowForm(true); }}
                        className="h-9 px-4 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30">Add First Bin</button>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>{showForm && <BinForm id={editId} onClose={() => { setShowForm(false); setEditId(null); }} />}</AnimatePresence>
      <AnimatePresence>{showBulk && <BulkImportModal onClose={() => setShowBulk(false)} />}</AnimatePresence>
    </div>
  );
}